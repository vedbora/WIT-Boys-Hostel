"""
WIT Boys Hostel API Tests - Iteration 3
Tests new signup-first flow: students must signup/login BEFORE applying for hostel
Major changes:
- POST /api/auth/student/register creates student user
- POST /api/applications now REQUIRES student auth (no name/email/phone in body)
- GET /api/applications/me returns student's latest application
- Admin approve reuses existing user_id (no new password generated)
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data prefixes for cleanup
TEST_PREFIX = "TEST_IT3_"


class TestStudentRegistration:
    """Test POST /api/auth/student/register endpoint"""
    
    def test_register_student_success(self):
        """POST /api/auth/student/register creates student user with name/email/phone/password"""
        unique_ts = int(time.time() * 1000)
        register_data = {
            "name": f"{TEST_PREFIX}New Student",
            "email": f"{TEST_PREFIX}newstudent{unique_ts}@test.com",
            "phone": f"9{unique_ts % 1000000000:09d}",
            "password": "TestPass123"
        }
        response = requests.post(f"{BASE_URL}/api/auth/student/register", json=register_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["role"] == "student"
        assert data["user"]["email"] == register_data["email"].lower()
        assert data["user"]["name"] == register_data["name"]
        assert data["user"]["phone"] == register_data["phone"]
        
        print(f"✓ Student registered successfully: {data['user']['email']}")
        return data
    
    def test_register_student_password_too_short(self):
        """POST /api/auth/student/register with password < 6 chars returns 400"""
        unique_ts = int(time.time() * 1000)
        register_data = {
            "name": f"{TEST_PREFIX}Short Pass",
            "email": f"{TEST_PREFIX}shortpass{unique_ts}@test.com",
            "phone": f"8{unique_ts % 1000000000:09d}",
            "password": "12345"  # Only 5 chars
        }
        response = requests.post(f"{BASE_URL}/api/auth/student/register", json=register_data)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "6 characters" in data["detail"].lower() or "password" in data["detail"].lower()
        print(f"✓ Password < 6 chars correctly rejected: {data['detail']}")
    
    def test_register_student_invalid_phone(self):
        """POST /api/auth/student/register with invalid phone returns 400"""
        unique_ts = int(time.time() * 1000)
        register_data = {
            "name": f"{TEST_PREFIX}Invalid Phone",
            "email": f"{TEST_PREFIX}invalidphone{unique_ts}@test.com",
            "phone": "abc123",  # Invalid phone
            "password": "TestPass123"
        }
        response = requests.post(f"{BASE_URL}/api/auth/student/register", json=register_data)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "phone" in data["detail"].lower()
        print(f"✓ Invalid phone correctly rejected: {data['detail']}")
    
    def test_register_student_duplicate_email(self):
        """POST /api/auth/student/register with duplicate email returns 400"""
        unique_ts = int(time.time() * 1000)
        email = f"{TEST_PREFIX}dupemail{unique_ts}@test.com"
        
        # First registration
        register_data = {
            "name": f"{TEST_PREFIX}First User",
            "email": email,
            "phone": f"7{unique_ts % 1000000000:09d}",
            "password": "TestPass123"
        }
        response1 = requests.post(f"{BASE_URL}/api/auth/student/register", json=register_data)
        assert response1.status_code == 200, f"First registration failed: {response1.text}"
        
        # Second registration with same email
        register_data2 = {
            "name": f"{TEST_PREFIX}Second User",
            "email": email,
            "phone": f"6{unique_ts % 1000000000:09d}",  # Different phone
            "password": "TestPass456"
        }
        response2 = requests.post(f"{BASE_URL}/api/auth/student/register", json=register_data2)
        assert response2.status_code == 400, f"Expected 400, got {response2.status_code}: {response2.text}"
        data = response2.json()
        assert "already exists" in data["detail"].lower() or "login" in data["detail"].lower()
        print(f"✓ Duplicate email correctly rejected: {data['detail']}")
    
    def test_register_student_duplicate_phone(self):
        """POST /api/auth/student/register with duplicate phone returns 400"""
        unique_ts = int(time.time() * 1000)
        phone = f"5{unique_ts % 1000000000:09d}"
        
        # First registration
        register_data = {
            "name": f"{TEST_PREFIX}First Phone User",
            "email": f"{TEST_PREFIX}firstphone{unique_ts}@test.com",
            "phone": phone,
            "password": "TestPass123"
        }
        response1 = requests.post(f"{BASE_URL}/api/auth/student/register", json=register_data)
        assert response1.status_code == 200, f"First registration failed: {response1.text}"
        
        # Second registration with same phone
        register_data2 = {
            "name": f"{TEST_PREFIX}Second Phone User",
            "email": f"{TEST_PREFIX}secondphone{unique_ts}@test.com",  # Different email
            "phone": phone,
            "password": "TestPass456"
        }
        response2 = requests.post(f"{BASE_URL}/api/auth/student/register", json=register_data2)
        assert response2.status_code == 400, f"Expected 400, got {response2.status_code}: {response2.text}"
        data = response2.json()
        assert "already exists" in data["detail"].lower() or "login" in data["detail"].lower()
        print(f"✓ Duplicate phone correctly rejected: {data['detail']}")


class TestStudentLogin:
    """Test POST /api/auth/student/login endpoint with identifier (email OR phone)"""
    
    @pytest.fixture
    def registered_student(self):
        """Register a student and return credentials"""
        unique_ts = int(time.time() * 1000)
        register_data = {
            "name": f"{TEST_PREFIX}Login Test Student",
            "email": f"{TEST_PREFIX}logintest{unique_ts}@test.com",
            "phone": f"4{unique_ts % 1000000000:09d}",
            "password": "TestPass123"
        }
        response = requests.post(f"{BASE_URL}/api/auth/student/register", json=register_data)
        assert response.status_code == 200, f"Registration failed: {response.text}"
        return {
            "email": register_data["email"],
            "phone": register_data["phone"],
            "password": register_data["password"],
            "name": register_data["name"]
        }
    
    def test_login_with_email(self, registered_student):
        """POST /api/auth/student/login with email+password works"""
        response = requests.post(f"{BASE_URL}/api/auth/student/login", json={
            "identifier": registered_student["email"],
            "password": registered_student["password"]
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "student"
        assert data["user"]["email"] == registered_student["email"].lower()
        print(f"✓ Student login with email works")
    
    def test_login_with_phone(self, registered_student):
        """POST /api/auth/student/login with phone+password works"""
        response = requests.post(f"{BASE_URL}/api/auth/student/login", json={
            "identifier": registered_student["phone"],
            "password": registered_student["password"]
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "student"
        assert data["user"]["phone"] == registered_student["phone"]
        print(f"✓ Student login with phone works")
    
    def test_login_wrong_password(self, registered_student):
        """POST /api/auth/student/login with wrong password returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/student/login", json={
            "identifier": registered_student["email"],
            "password": "WrongPassword123"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print(f"✓ Wrong password correctly rejected")
    
    def test_login_nonexistent_user(self):
        """POST /api/auth/student/login with non-existent user returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/student/login", json={
            "identifier": "nonexistent@test.com",
            "password": "TestPass123"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print(f"✓ Non-existent user correctly rejected")


class TestApplicationRequiresAuth:
    """Test POST /api/applications now REQUIRES student auth"""
    
    def test_application_without_auth_returns_401(self):
        """POST /api/applications without auth returns 401"""
        app_data = {
            "course": "B.Tech",
            "year": "2nd",
            "percentage": 75.0,
            "backlogs": 0,
            "preferred_room_type": "3 Seater"
        }
        response = requests.post(f"{BASE_URL}/api/applications", json=app_data)
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print(f"✓ Application without auth correctly returns 401")
    
    def test_application_with_admin_returns_403(self):
        """POST /api/applications with admin token returns 403 (student only)"""
        # Login as admin
        admin_resp = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": "admin@witboys.com",
            "password": "Admin@123"
        })
        admin_token = admin_resp.json()["token"]
        
        app_data = {
            "course": "B.Tech",
            "year": "2nd",
            "percentage": 75.0,
            "backlogs": 0,
            "preferred_room_type": "3 Seater"
        }
        response = requests.post(f"{BASE_URL}/api/applications", json=app_data, headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print(f"✓ Application with admin token correctly returns 403")


class TestApplicationWithStudentAuth:
    """Test POST /api/applications with student auth"""
    
    @pytest.fixture
    def student_token(self):
        """Register a student and return token"""
        unique_ts = int(time.time() * 1000)
        register_data = {
            "name": f"{TEST_PREFIX}App Test Student",
            "email": f"{TEST_PREFIX}apptest{unique_ts}@test.com",
            "phone": f"3{unique_ts % 1000000000:09d}",
            "password": "TestPass123"
        }
        response = requests.post(f"{BASE_URL}/api/auth/student/register", json=register_data)
        assert response.status_code == 200, f"Registration failed: {response.text}"
        return response.json()["token"]
    
    def test_application_with_student_auth_success(self, student_token):
        """POST /api/applications with student auth creates application"""
        app_data = {
            "course": "B.Tech",
            "year": "2nd",
            "percentage": 75.0,
            "backlogs": 0,
            "preferred_room_type": "3 Seater"
        }
        response = requests.post(f"{BASE_URL}/api/applications", json=app_data, headers={
            "Authorization": f"Bearer {student_token}"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify application uses user's data from session
        assert "user_id" in data, "Application should have user_id"
        assert "name" in data, "Application should have name from user"
        assert "email" in data, "Application should have email from user"
        assert "phone" in data, "Application should have phone from user"
        assert data["status"] == "Pending"
        assert data["suggested_room_type"] == "3 Seater"  # 75% >= 60 -> 3 Seater
        
        print(f"✓ Application created with user data from session: {data['name']}")
        return data
    
    def test_application_payload_only_needs_academic_fields(self, student_token):
        """POST /api/applications payload only needs course/year/percentage/backlogs/preferred_room_type"""
        app_data = {
            "course": "M.Tech",
            "year": "1st",
            "percentage": 85.0,
            "backlogs": 1,
            "preferred_room_type": "2 Seater"
        }
        response = requests.post(f"{BASE_URL}/api/applications", json=app_data, headers={
            "Authorization": f"Bearer {student_token}"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["course"] == "M.Tech"
        assert data["year"] == "1st"
        assert data["percentage"] == 85.0
        assert data["backlogs"] == 1
        assert data["preferred_room_type"] == "2 Seater"
        print(f"✓ Application created with only academic fields in payload")
    
    def test_application_auto_reject_backlogs(self):
        """POST /api/applications with backlogs > 2 still auto-rejects"""
        unique_ts = int(time.time() * 1000)
        register_data = {
            "name": f"{TEST_PREFIX}Backlog Student",
            "email": f"{TEST_PREFIX}backlog{unique_ts}@test.com",
            "phone": f"2{unique_ts % 1000000000:09d}",
            "password": "TestPass123"
        }
        reg_resp = requests.post(f"{BASE_URL}/api/auth/student/register", json=register_data)
        token = reg_resp.json()["token"]
        
        app_data = {
            "course": "B.Tech",
            "year": "4th",
            "percentage": 50.0,
            "backlogs": 3,  # > 2 backlogs
            "preferred_room_type": "4 Seater"
        }
        response = requests.post(f"{BASE_URL}/api/applications", json=app_data, headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "Rejected"
        assert "backlog" in data["reject_reason"].lower()
        print(f"✓ Application with >2 backlogs auto-rejected: {data['reject_reason']}")


class TestDuplicateApplicationPrevention:
    """Test POST /api/applications prevents duplicate active application for same user"""
    
    def test_duplicate_active_application_blocked(self):
        """POST /api/applications prevents duplicate active application for same user"""
        unique_ts = int(time.time() * 1000)
        register_data = {
            "name": f"{TEST_PREFIX}Duplicate App Student",
            "email": f"{TEST_PREFIX}dupapp{unique_ts}@test.com",
            "phone": f"1{unique_ts % 1000000000:09d}",
            "password": "TestPass123"
        }
        reg_resp = requests.post(f"{BASE_URL}/api/auth/student/register", json=register_data)
        token = reg_resp.json()["token"]
        
        # First application
        app_data = {
            "course": "B.Tech",
            "year": "2nd",
            "percentage": 70.0,
            "backlogs": 0,
            "preferred_room_type": "3 Seater"
        }
        response1 = requests.post(f"{BASE_URL}/api/applications", json=app_data, headers={
            "Authorization": f"Bearer {token}"
        })
        assert response1.status_code == 200, f"First application failed: {response1.text}"
        
        # Second application (should be blocked)
        response2 = requests.post(f"{BASE_URL}/api/applications", json=app_data, headers={
            "Authorization": f"Bearer {token}"
        })
        assert response2.status_code == 400, f"Expected 400, got {response2.status_code}: {response2.text}"
        data = response2.json()
        assert "active application" in data["detail"].lower() or "already" in data["detail"].lower()
        print(f"✓ Duplicate active application correctly blocked: {data['detail']}")


class TestApplicationsMe:
    """Test GET /api/applications/me endpoint"""
    
    def test_applications_me_requires_auth(self):
        """GET /api/applications/me requires student auth"""
        response = requests.get(f"{BASE_URL}/api/applications/me")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print(f"✓ /api/applications/me requires auth")
    
    def test_applications_me_returns_null_if_not_applied(self):
        """GET /api/applications/me returns null if student hasn't applied"""
        unique_ts = int(time.time() * 1000)
        register_data = {
            "name": f"{TEST_PREFIX}No App Student",
            "email": f"{TEST_PREFIX}noapp{unique_ts}@test.com",
            "phone": f"9{unique_ts % 1000000000:09d}",
            "password": "TestPass123"
        }
        reg_resp = requests.post(f"{BASE_URL}/api/auth/student/register", json=register_data)
        token = reg_resp.json()["token"]
        
        response = requests.get(f"{BASE_URL}/api/applications/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data is None, f"Expected null for student without application, got {data}"
        print(f"✓ /api/applications/me returns null for student without application")
    
    def test_applications_me_returns_latest_application(self):
        """GET /api/applications/me returns student's latest application"""
        unique_ts = int(time.time() * 1000)
        register_data = {
            "name": f"{TEST_PREFIX}Has App Student",
            "email": f"{TEST_PREFIX}hasapp{unique_ts}@test.com",
            "phone": f"8{unique_ts % 1000000000:09d}",
            "password": "TestPass123"
        }
        reg_resp = requests.post(f"{BASE_URL}/api/auth/student/register", json=register_data)
        token = reg_resp.json()["token"]
        
        # Create application
        app_data = {
            "course": "B.Tech",
            "year": "3rd",
            "percentage": 80.0,
            "backlogs": 0,
            "preferred_room_type": "2 Seater"
        }
        app_resp = requests.post(f"{BASE_URL}/api/applications", json=app_data, headers={
            "Authorization": f"Bearer {token}"
        })
        created_app = app_resp.json()
        
        # Get my application
        response = requests.get(f"{BASE_URL}/api/applications/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data is not None, "Expected application data"
        assert data["id"] == created_app["id"]
        assert data["course"] == "B.Tech"
        assert data["status"] == "Pending"
        print(f"✓ /api/applications/me returns student's application: {data['id']}")


class TestAdminApproveReusesExistingUser:
    """Test admin approve reuses existing user_id from application"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": "admin@witboys.com",
            "password": "Admin@123"
        })
        return response.json()["token"]
    
    def test_approve_reuses_existing_user_no_new_password(self, admin_token):
        """POST /api/applications/{id}/approve reuses existing user_id, no new password generated"""
        unique_ts = int(time.time() * 1000)
        password = "MySignupPassword123"
        
        # Register student
        register_data = {
            "name": f"{TEST_PREFIX}Approve Test Student",
            "email": f"{TEST_PREFIX}approvetest{unique_ts}@test.com",
            "phone": f"7{unique_ts % 1000000000:09d}",
            "password": password
        }
        reg_resp = requests.post(f"{BASE_URL}/api/auth/student/register", json=register_data)
        token = reg_resp.json()["token"]
        user_id = reg_resp.json()["user"]["id"]
        
        # Create application
        app_data = {
            "course": "B.Tech",
            "year": "2nd",
            "percentage": 85.0,
            "backlogs": 0,
            "preferred_room_type": "2 Seater"
        }
        app_resp = requests.post(f"{BASE_URL}/api/applications", json=app_data, headers={
            "Authorization": f"Bearer {token}"
        })
        app_id = app_resp.json()["id"]
        
        # Admin approves
        approve_resp = requests.post(f"{BASE_URL}/api/applications/{app_id}/approve", 
            json={}, headers={"Authorization": f"Bearer {admin_token}"})
        assert approve_resp.status_code == 200, f"Approve failed: {approve_resp.text}"
        approve_data = approve_resp.json()
        
        # Verify response
        assert approve_data["ok"] == True
        assert "student_id" in approve_data
        assert "room_number" in approve_data
        assert "bed_number" in approve_data
        assert "login_credentials" in approve_data
        
        # Verify login_credentials references existing signup password (no new password)
        creds = approve_data["login_credentials"]
        assert creds["phone"] == register_data["phone"]
        # Password should indicate existing signup password, not a new generated one
        assert "existing" in creds["password"].lower() or "signup" in creds["password"].lower() or len(creds["password"]) > 20
        
        print(f"✓ Admin approve reuses existing user, credentials: {creds}")
        
        # Verify student can still login with their ORIGINAL signup password
        login_resp = requests.post(f"{BASE_URL}/api/auth/student/login", json={
            "identifier": register_data["email"],
            "password": password  # Original signup password
        })
        assert login_resp.status_code == 200, f"Login with original password failed: {login_resp.text}"
        print(f"✓ Student can login with original signup password after approval")
        
        return approve_data


class TestEndToEndSignupApplyApproveLogin:
    """End-to-end test: signup → apply → admin approve → student login → GET /students/me"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": "admin@witboys.com",
            "password": "Admin@123"
        })
        return response.json()["token"]
    
    def test_full_e2e_flow(self, admin_token):
        """Full e2e: signup → apply → approve → login → /students/me returns room"""
        unique_ts = int(time.time() * 1000)
        password = "E2ETestPassword123"
        
        # 1. Student signup
        register_data = {
            "name": f"{TEST_PREFIX}E2E Student",
            "email": f"{TEST_PREFIX}e2e{unique_ts}@test.com",
            "phone": f"6{unique_ts % 1000000000:09d}",
            "password": password
        }
        reg_resp = requests.post(f"{BASE_URL}/api/auth/student/register", json=register_data)
        assert reg_resp.status_code == 200, f"Registration failed: {reg_resp.text}"
        student_token = reg_resp.json()["token"]
        print(f"✓ Step 1: Student registered")
        
        # 2. Student applies
        app_data = {
            "course": "B.Tech",
            "year": "2nd",
            "percentage": 82.0,
            "backlogs": 0,
            "preferred_room_type": "2 Seater"
        }
        app_resp = requests.post(f"{BASE_URL}/api/applications", json=app_data, headers={
            "Authorization": f"Bearer {student_token}"
        })
        assert app_resp.status_code == 200, f"Application failed: {app_resp.text}"
        app_id = app_resp.json()["id"]
        print(f"✓ Step 2: Application submitted, id={app_id}")
        
        # 3. Admin approves
        approve_resp = requests.post(f"{BASE_URL}/api/applications/{app_id}/approve", 
            json={}, headers={"Authorization": f"Bearer {admin_token}"})
        assert approve_resp.status_code == 200, f"Approve failed: {approve_resp.text}"
        approve_data = approve_resp.json()
        room_number = approve_data["room_number"]
        bed_number = approve_data["bed_number"]
        print(f"✓ Step 3: Application approved, room={room_number}, bed={bed_number}")
        
        # 4. Student logs in with their SIGNUP password
        login_resp = requests.post(f"{BASE_URL}/api/auth/student/login", json={
            "identifier": register_data["email"],
            "password": password
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        new_token = login_resp.json()["token"]
        print(f"✓ Step 4: Student logged in with signup password")
        
        # 5. GET /students/me returns room
        me_resp = requests.get(f"{BASE_URL}/api/students/me", headers={
            "Authorization": f"Bearer {new_token}"
        })
        assert me_resp.status_code == 200, f"/students/me failed: {me_resp.text}"
        student_data = me_resp.json()
        assert student_data["room_number"] == room_number
        assert student_data["bed_number"] == bed_number
        assert "fees_status" in student_data
        print(f"✓ Step 5: /students/me returns room={student_data['room_number']}, bed={student_data['bed_number']}")
        
        print(f"✓ Full E2E flow completed successfully!")


class TestLegacyRegressionAdminLogin:
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


class TestLegacyRegressionRoomsCRUD:
    """Regression: Room CRUD still works"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": "admin@witboys.com",
            "password": "Admin@123"
        })
        return response.json()["token"]
    
    def test_list_rooms(self, admin_token):
        """GET /api/rooms lists rooms"""
        response = requests.get(f"{BASE_URL}/api/rooms", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        rooms = response.json()
        assert isinstance(rooms, list)
        assert len(rooms) >= 8, f"Expected at least 8 seeded rooms, got {len(rooms)}"
        print(f"✓ Listed {len(rooms)} rooms")
    
    def test_create_and_delete_room(self, admin_token):
        """POST /api/rooms creates room, DELETE removes it"""
        unique_ts = int(time.time() * 1000)
        room_data = {
            "room_number": f"{TEST_PREFIX}{unique_ts % 1000}",
            "room_type": "2 Seater",
            "fees": 45000
        }
        create_resp = requests.post(f"{BASE_URL}/api/rooms", json=room_data, headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert create_resp.status_code == 200, f"Create failed: {create_resp.text}"
        room_id = create_resp.json()["id"]
        
        delete_resp = requests.delete(f"{BASE_URL}/api/rooms/{room_id}", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert delete_resp.status_code == 200
        print(f"✓ Room CRUD still works")


class TestLegacyRegressionComplaints:
    """Regression: Complaints still work"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": "admin@witboys.com",
            "password": "Admin@123"
        })
        return response.json()["token"]
    
    @pytest.fixture
    def approved_student_token(self, admin_token):
        """Create, apply, approve a student and return their token"""
        unique_ts = int(time.time() * 1000)
        password = "ComplaintTestPass123"
        
        # Register
        reg_resp = requests.post(f"{BASE_URL}/api/auth/student/register", json={
            "name": f"{TEST_PREFIX}Complaint Student",
            "email": f"{TEST_PREFIX}complaint{unique_ts}@test.com",
            "phone": f"5{unique_ts % 1000000000:09d}",
            "password": password
        })
        token = reg_resp.json()["token"]
        
        # Apply
        app_resp = requests.post(f"{BASE_URL}/api/applications", json={
            "course": "B.Tech",
            "year": "2nd",
            "percentage": 70.0,
            "backlogs": 0,
            "preferred_room_type": "3 Seater"
        }, headers={"Authorization": f"Bearer {token}"})
        app_id = app_resp.json()["id"]
        
        # Approve
        requests.post(f"{BASE_URL}/api/applications/{app_id}/approve", 
            json={}, headers={"Authorization": f"Bearer {admin_token}"})
        
        # Re-login to get fresh token with student_id
        login_resp = requests.post(f"{BASE_URL}/api/auth/student/login", json={
            "identifier": f"{TEST_PREFIX}complaint{unique_ts}@test.com",
            "password": password
        })
        return login_resp.json()["token"]
    
    def test_complaints_crud(self, admin_token, approved_student_token):
        """Create, list, update complaint status"""
        # Create complaint
        complaint_data = {
            "title": f"{TEST_PREFIX}Test Complaint",
            "description": "Test description",
            "category": "Maintenance"
        }
        create_resp = requests.post(f"{BASE_URL}/api/complaints", json=complaint_data, headers={
            "Authorization": f"Bearer {approved_student_token}"
        })
        assert create_resp.status_code == 200, f"Create complaint failed: {create_resp.text}"
        complaint_id = create_resp.json()["id"]
        
        # List complaints (admin)
        list_resp = requests.get(f"{BASE_URL}/api/complaints", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert list_resp.status_code == 200
        
        # Update status
        update_resp = requests.patch(f"{BASE_URL}/api/complaints/{complaint_id}", 
            json={"status": "In Progress"}, headers={"Authorization": f"Bearer {admin_token}"})
        assert update_resp.status_code == 200
        print("✓ Complaints CRUD still works")


class TestLegacyRegressionCSVExports:
    """Regression: CSV exports still work"""
    
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


class TestLegacyRegressionDashboardStats:
    """Regression: Dashboard stats still work"""
    
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
        
        print(f"✓ Dashboard stats: {data['total_rooms']} rooms, {data['total_beds']} beds")


class TestPaymentsConfig:
    """Test /api/payments/config still returns enabled:false"""
    
    def test_payments_config_disabled(self):
        """GET /api/payments/config returns enabled:false (no Razorpay keys)"""
        response = requests.get(f"{BASE_URL}/api/payments/config")
        assert response.status_code == 200
        data = response.json()
        assert data["enabled"] == False
        print(f"✓ /api/payments/config returns enabled=False")


class TestWaitlistRequiresApplication:
    """Test waitlist flow still enforces application exists + Pending"""
    
    def test_waitlist_requires_pending_application(self):
        """POST /api/waitlist/create-order requires pending application"""
        # Try with non-existent application
        response = requests.post(f"{BASE_URL}/api/waitlist/create-order", json={
            "application_id": "nonexistent-app-id"
        })
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print(f"✓ Waitlist requires existing application")
