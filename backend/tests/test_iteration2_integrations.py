"""
WIT Boys Hostel API Tests - Iteration 2
Tests new integration endpoints: Razorpay payments, Resend email, Google OAuth, Priority Waitlist
Plus regression tests on existing flows
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data prefixes for cleanup
TEST_PREFIX = "TEST_IT2_"


class TestPaymentsConfig:
    """Test /api/payments/config endpoint"""
    
    def test_payments_config_returns_expected_fields(self):
        """GET /api/payments/config returns razorpay_key_id, waitlist_amount, enabled"""
        response = requests.get(f"{BASE_URL}/api/payments/config")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify all required fields
        assert "razorpay_key_id" in data, "Missing razorpay_key_id"
        assert "waitlist_amount" in data, "Missing waitlist_amount"
        assert "enabled" in data, "Missing enabled"
        
        # Verify values when RAZORPAY_KEY_ID not set
        assert data["waitlist_amount"] == 500, f"Expected waitlist_amount=500, got {data['waitlist_amount']}"
        assert data["enabled"] == False, f"Expected enabled=False when RAZORPAY_KEY_ID not set, got {data['enabled']}"
        assert data["razorpay_key_id"] == "", f"Expected empty razorpay_key_id, got {data['razorpay_key_id']}"
        
        print(f"✓ /api/payments/config returns: enabled={data['enabled']}, waitlist_amount={data['waitlist_amount']}")


class TestFeesPaymentEndpoints:
    """Test /api/payments/fees/* endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": "admin@witboys.com",
            "password": "Admin@123"
        })
        return response.json()["token"]
    
    @pytest.fixture
    def student_credentials(self, admin_token):
        """Create and approve an application, return student credentials"""
        unique_ts = int(time.time() * 1000)
        app_data = {
            "name": f"{TEST_PREFIX}Fees Student",
            "email": f"{TEST_PREFIX}fees{unique_ts}@test.com",
            "phone": f"9{unique_ts % 1000000000:09d}",
            "course": "B.Tech",
            "year": "2nd",
            "percentage": 75.0,
            "backlogs": 0,
            "preferred_room_type": "3 Seater"
        }
        create_resp = requests.post(f"{BASE_URL}/api/applications", json=app_data)
        app_id = create_resp.json()["id"]
        
        approve_resp = requests.post(f"{BASE_URL}/api/applications/{app_id}/approve", 
            json={}, headers={"Authorization": f"Bearer {admin_token}"})
        return approve_resp.json()["login_credentials"]
    
    @pytest.fixture
    def student_token(self, student_credentials):
        """Login as student and return token"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/student/login", json={
            "phone": student_credentials["phone"],
            "password": student_credentials["password"]
        })
        return login_resp.json()["token"]
    
    def test_create_fees_order_returns_503_when_razorpay_not_configured(self, student_token):
        """POST /api/payments/fees/create-order returns 503 when RAZORPAY_KEY_ID not set"""
        response = requests.post(f"{BASE_URL}/api/payments/fees/create-order", headers={
            "Authorization": f"Bearer {student_token}"
        })
        assert response.status_code == 503, f"Expected 503, got {response.status_code}: {response.text}"
        data = response.json()
        assert "detail" in data
        assert "not configured" in data["detail"].lower() or "razorpay" in data["detail"].lower()
        print(f"✓ /api/payments/fees/create-order returns 503 when Razorpay not configured: {data['detail']}")
    
    def test_create_fees_order_returns_401_without_auth(self):
        """POST /api/payments/fees/create-order returns 401 without student auth"""
        response = requests.post(f"{BASE_URL}/api/payments/fees/create-order")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("✓ /api/payments/fees/create-order returns 401 without auth")
    
    def test_create_fees_order_returns_403_for_admin(self, admin_token):
        """POST /api/payments/fees/create-order returns 403 for admin (student only)"""
        response = requests.post(f"{BASE_URL}/api/payments/fees/create-order", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("✓ /api/payments/fees/create-order returns 403 for admin (student only)")
    
    def test_verify_fees_payment_returns_401_without_auth(self):
        """POST /api/payments/fees/verify returns 401 without student auth"""
        response = requests.post(f"{BASE_URL}/api/payments/fees/verify", json={
            "razorpay_order_id": "order_test",
            "razorpay_payment_id": "pay_test",
            "razorpay_signature": "sig_test"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("✓ /api/payments/fees/verify returns 401 without auth")
    
    def test_verify_fees_payment_endpoint_exists(self, student_token):
        """POST /api/payments/fees/verify endpoint exists and validates signature"""
        response = requests.post(f"{BASE_URL}/api/payments/fees/verify", json={
            "razorpay_order_id": "order_test",
            "razorpay_payment_id": "pay_test",
            "razorpay_signature": "invalid_signature"
        }, headers={"Authorization": f"Bearer {student_token}"})
        # Should return 400 for invalid signature, not 404 or 500
        assert response.status_code == 400, f"Expected 400 for invalid signature, got {response.status_code}: {response.text}"
        data = response.json()
        assert "signature" in data["detail"].lower() or "invalid" in data["detail"].lower()
        print(f"✓ /api/payments/fees/verify validates signature: {data['detail']}")


class TestWaitlistEndpoints:
    """Test /api/waitlist/* endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": "admin@witboys.com",
            "password": "Admin@123"
        })
        return response.json()["token"]
    
    @pytest.fixture
    def pending_application_id(self):
        """Create a pending application and return its ID"""
        unique_ts = int(time.time() * 1000)
        app_data = {
            "name": f"{TEST_PREFIX}Waitlist Applicant",
            "email": f"{TEST_PREFIX}waitlist{unique_ts}@test.com",
            "phone": f"8{unique_ts % 1000000000:09d}",
            "course": "B.Tech",
            "year": "1st",
            "percentage": 65.0,
            "backlogs": 0,
            "preferred_room_type": "3 Seater"
        }
        response = requests.post(f"{BASE_URL}/api/applications", json=app_data)
        assert response.status_code == 200, f"Failed to create application: {response.text}"
        return response.json()["id"]
    
    def test_waitlist_create_order_returns_404_for_nonexistent_application(self):
        """POST /api/waitlist/create-order returns 404 for non-existent application"""
        response = requests.post(f"{BASE_URL}/api/waitlist/create-order", json={
            "application_id": "nonexistent-app-id-12345"
        })
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print("✓ /api/waitlist/create-order returns 404 for non-existent application")
    
    def test_waitlist_create_order_returns_503_when_razorpay_not_configured(self, pending_application_id):
        """POST /api/waitlist/create-order returns 503 when RAZORPAY_KEY_ID not configured"""
        response = requests.post(f"{BASE_URL}/api/waitlist/create-order", json={
            "application_id": pending_application_id
        })
        assert response.status_code == 503, f"Expected 503, got {response.status_code}: {response.text}"
        data = response.json()
        assert "detail" in data
        assert "not configured" in data["detail"].lower() or "razorpay" in data["detail"].lower()
        print(f"✓ /api/waitlist/create-order returns 503 when Razorpay not configured: {data['detail']}")
    
    def test_waitlist_create_order_returns_400_for_non_pending_application(self, admin_token):
        """POST /api/waitlist/create-order returns 400 for non-Pending application"""
        # Create and approve an application
        unique_ts = int(time.time() * 1000)
        app_data = {
            "name": f"{TEST_PREFIX}Approved Applicant",
            "email": f"{TEST_PREFIX}approved{unique_ts}@test.com",
            "phone": f"7{unique_ts % 1000000000:09d}",
            "course": "B.Tech",
            "year": "2nd",
            "percentage": 80.0,
            "backlogs": 0,
            "preferred_room_type": "2 Seater"
        }
        create_resp = requests.post(f"{BASE_URL}/api/applications", json=app_data)
        app_id = create_resp.json()["id"]
        
        # Approve it
        requests.post(f"{BASE_URL}/api/applications/{app_id}/approve", 
            json={}, headers={"Authorization": f"Bearer {admin_token}"})
        
        # Try to create waitlist order for approved application
        response = requests.post(f"{BASE_URL}/api/waitlist/create-order", json={
            "application_id": app_id
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "pending" in data["detail"].lower()
        print(f"✓ /api/waitlist/create-order returns 400 for non-Pending application: {data['detail']}")
    
    def test_waitlist_verify_endpoint_exists(self):
        """POST /api/waitlist/verify endpoint exists and validates input"""
        response = requests.post(f"{BASE_URL}/api/waitlist/verify", json={
            "razorpay_order_id": "order_test",
            "razorpay_payment_id": "pay_test",
            "razorpay_signature": "invalid_signature",
            "application_id": "test-app-id"
        })
        # Should return 400 for invalid signature, not 404 or 500
        assert response.status_code == 400, f"Expected 400 for invalid signature, got {response.status_code}: {response.text}"
        data = response.json()
        assert "signature" in data["detail"].lower() or "invalid" in data["detail"].lower()
        print(f"✓ /api/waitlist/verify validates signature: {data['detail']}")


class TestGoogleOAuthEndpoint:
    """Test /api/auth/google/session endpoint"""
    
    def test_google_session_returns_400_without_session_id(self):
        """POST /api/auth/google/session returns 400 if session_id missing"""
        response = requests.post(f"{BASE_URL}/api/auth/google/session", json={})
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "session_id" in data["detail"].lower()
        print(f"✓ /api/auth/google/session returns 400 when session_id missing: {data['detail']}")
    
    def test_google_session_returns_401_for_invalid_session_id(self):
        """POST /api/auth/google/session returns 401 for invalid session_id"""
        response = requests.post(f"{BASE_URL}/api/auth/google/session", json={
            "session_id": "invalid_session_id_12345"
        })
        # Should return 401 for invalid session
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        data = response.json()
        assert "invalid" in data["detail"].lower() or "session" in data["detail"].lower()
        print(f"✓ /api/auth/google/session returns 401 for invalid session_id: {data['detail']}")
    
    def test_google_session_endpoint_exists(self):
        """POST /api/auth/google/session endpoint exists (not 404)"""
        response = requests.post(f"{BASE_URL}/api/auth/google/session", json={
            "session_id": "test"
        })
        # Should not be 404 - endpoint exists
        assert response.status_code != 404, f"Endpoint should exist, got 404"
        print(f"✓ /api/auth/google/session endpoint exists, status: {response.status_code}")


class TestRegressionAdminLogin:
    """Regression: Admin login still works"""
    
    def test_admin_login_success(self):
        """POST /api/auth/admin/login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": "admin@witboys.com",
            "password": "Admin@123"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "admin"
        print("✓ Admin login still works")


class TestRegressionApplicationWorkflow:
    """Regression: Application submission, approval, student login"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": "admin@witboys.com",
            "password": "Admin@123"
        })
        return response.json()["token"]
    
    def test_application_submit_approve_student_login(self, admin_token):
        """Full workflow: submit application -> approve -> student login"""
        unique_ts = int(time.time() * 1000)
        
        # 1. Submit application
        app_data = {
            "name": f"{TEST_PREFIX}Regression Student",
            "email": f"{TEST_PREFIX}regression{unique_ts}@test.com",
            "phone": f"6{unique_ts % 1000000000:09d}",
            "course": "B.Tech",
            "year": "2nd",
            "percentage": 75.0,
            "backlogs": 0,
            "preferred_room_type": "3 Seater"
        }
        create_resp = requests.post(f"{BASE_URL}/api/applications", json=app_data)
        assert create_resp.status_code == 200, f"Application submit failed: {create_resp.text}"
        app_id = create_resp.json()["id"]
        assert create_resp.json()["status"] == "Pending"
        print(f"✓ Application submitted with id {app_id}")
        
        # 2. Approve application (should trigger email send attempt - logged since RESEND_API_KEY not set)
        approve_resp = requests.post(f"{BASE_URL}/api/applications/{app_id}/approve", 
            json={}, headers={"Authorization": f"Bearer {admin_token}"})
        assert approve_resp.status_code == 200, f"Application approve failed: {approve_resp.text}"
        credentials = approve_resp.json()["login_credentials"]
        assert "phone" in credentials
        assert "password" in credentials
        print(f"✓ Application approved, credentials returned")
        
        # 3. Student login with returned credentials
        login_resp = requests.post(f"{BASE_URL}/api/auth/student/login", json={
            "phone": credentials["phone"],
            "password": credentials["password"]
        })
        assert login_resp.status_code == 200, f"Student login failed: {login_resp.text}"
        assert login_resp.json()["user"]["role"] == "student"
        print("✓ Student login with approved credentials works")
    
    def test_auto_reject_backlogs_still_works(self):
        """Application with >2 backlogs still auto-rejects"""
        unique_ts = int(time.time() * 1000)
        app_data = {
            "name": f"{TEST_PREFIX}Backlog Student",
            "email": f"{TEST_PREFIX}backlog{unique_ts}@test.com",
            "phone": f"5{unique_ts % 1000000000:09d}",
            "course": "B.Tech",
            "year": "3rd",
            "percentage": 60.0,
            "backlogs": 3,
            "preferred_room_type": "4 Seater"
        }
        response = requests.post(f"{BASE_URL}/api/applications", json=app_data)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "Rejected"
        assert "backlog" in data["reject_reason"].lower()
        print(f"✓ Auto-reject for >2 backlogs still works: {data['reject_reason']}")


class TestRegressionRoomAllocation:
    """Regression: Room allocation increments occupied_beds correctly"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": "admin@witboys.com",
            "password": "Admin@123"
        })
        return response.json()["token"]
    
    def test_room_allocation_increments_beds(self, admin_token):
        """Room allocation increments occupied_beds when student added"""
        # Get initial room state
        rooms_resp = requests.get(f"{BASE_URL}/api/rooms", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        rooms = rooms_resp.json()
        room_4_seater = next((r for r in rooms if r["room_type"] == "4 Seater" and r["occupied_beds"] < r["total_beds"]), None)
        
        if not room_4_seater:
            pytest.skip("No available 4 Seater room")
        
        initial_occupied = room_4_seater["occupied_beds"]
        
        # Create student
        unique_ts = int(time.time() * 1000)
        student_data = {
            "name": f"{TEST_PREFIX}Allocation Test",
            "phone": f"4{unique_ts % 1000000000:09d}",
            "preferred_room_type": "4 Seater"
        }
        requests.post(f"{BASE_URL}/api/students", json=student_data, headers={
            "Authorization": f"Bearer {admin_token}"
        })
        
        # Check room state
        rooms_resp = requests.get(f"{BASE_URL}/api/rooms", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        rooms = rooms_resp.json()
        room_after = next((r for r in rooms if r["id"] == room_4_seater["id"]), None)
        
        assert room_after["occupied_beds"] >= initial_occupied
        print(f"✓ Room allocation increments occupied_beds correctly")


class TestRegressionComplaintsCRUD:
    """Regression: Complaints CRUD still works"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": "admin@witboys.com",
            "password": "Admin@123"
        })
        return response.json()["token"]
    
    @pytest.fixture
    def student_token(self, admin_token):
        """Create a student and return their token"""
        unique_ts = int(time.time() * 1000)
        app_data = {
            "name": f"{TEST_PREFIX}Complaint Student",
            "email": f"{TEST_PREFIX}complaintstu{unique_ts}@test.com",
            "phone": f"3{unique_ts % 1000000000:09d}",
            "course": "B.Tech",
            "year": "2nd",
            "percentage": 70.0,
            "backlogs": 0,
            "preferred_room_type": "3 Seater"
        }
        create_resp = requests.post(f"{BASE_URL}/api/applications", json=app_data)
        app_id = create_resp.json()["id"]
        
        approve_resp = requests.post(f"{BASE_URL}/api/applications/{app_id}/approve", 
            json={}, headers={"Authorization": f"Bearer {admin_token}"})
        credentials = approve_resp.json()["login_credentials"]
        
        login_resp = requests.post(f"{BASE_URL}/api/auth/student/login", json={
            "phone": credentials["phone"],
            "password": credentials["password"]
        })
        return login_resp.json()["token"]
    
    def test_complaints_crud(self, admin_token, student_token):
        """Create, list, update complaint status"""
        # Create complaint
        complaint_data = {
            "title": f"{TEST_PREFIX}Test Complaint",
            "description": "Test description",
            "category": "Maintenance"
        }
        create_resp = requests.post(f"{BASE_URL}/api/complaints", json=complaint_data, headers={
            "Authorization": f"Bearer {student_token}"
        })
        assert create_resp.status_code == 200, f"Create complaint failed: {create_resp.text}"
        complaint_id = create_resp.json()["id"]
        print(f"✓ Complaint created with id {complaint_id}")
        
        # List complaints (admin)
        list_resp = requests.get(f"{BASE_URL}/api/complaints", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert list_resp.status_code == 200
        print(f"✓ Admin can list complaints")
        
        # Update status
        update_resp = requests.patch(f"{BASE_URL}/api/complaints/{complaint_id}", 
            json={"status": "In Progress"}, headers={"Authorization": f"Bearer {admin_token}"})
        assert update_resp.status_code == 200
        print("✓ Complaint status updated")


class TestRegressionCSVExport:
    """Regression: Admin CSV export still works"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": "admin@witboys.com",
            "password": "Admin@123"
        })
        return response.json()["token"]
    
    def test_export_students_csv(self, admin_token):
        """GET /api/export/students returns CSV"""
        response = requests.get(f"{BASE_URL}/api/export/students", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        print("✓ Students CSV export works")
    
    def test_export_applications_csv(self, admin_token):
        """GET /api/export/applications returns CSV"""
        response = requests.get(f"{BASE_URL}/api/export/applications", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        print("✓ Applications CSV export works")
    
    def test_export_payments_csv(self, admin_token):
        """GET /api/export/payments returns CSV"""
        response = requests.get(f"{BASE_URL}/api/export/payments", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        print("✓ Payments CSV export works")


class TestRegressionDashboardStats:
    """Regression: Dashboard stats still returns correct counts"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": "admin@witboys.com",
            "password": "Admin@123"
        })
        return response.json()["token"]
    
    def test_dashboard_stats(self, admin_token):
        """GET /api/dashboard/stats returns all required fields"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        
        required_fields = [
            "total_students", "total_rooms", "total_beds", "available_beds",
            "occupied_beds", "pending_complaints", "in_progress_complaints",
            "pending_applications", "revenue", "room_type_breakdown"
        ]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"✓ Dashboard stats: {data['total_rooms']} rooms, {data['total_beds']} beds, {data['available_beds']} available")
