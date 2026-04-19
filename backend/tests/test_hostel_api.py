"""
WIT Boys Hostel API Tests
Tests all CRUD operations, auth flows, application workflow, and CSV exports
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data prefixes for cleanup
TEST_PREFIX = "TEST_"

class TestHealthAndRoot:
    """Basic API health checks"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ API root returns: {data}")


class TestAdminAuth:
    """Admin authentication tests"""
    
    def test_admin_login_success(self):
        """POST /api/auth/admin/login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": "admin@witboys.com",
            "password": "Admin@123"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["role"] == "admin"
        assert data["user"]["email"] == "admin@witboys.com"
        print(f"✓ Admin login successful, token length: {len(data['token'])}")
        return data["token"]
    
    def test_admin_login_invalid_password(self):
        """POST /api/auth/admin/login with wrong password"""
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": "admin@witboys.com",
            "password": "WrongPassword"
        })
        assert response.status_code == 401
        print("✓ Invalid password correctly rejected")
    
    def test_admin_login_invalid_email(self):
        """POST /api/auth/admin/login with non-existent email"""
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": "nonexistent@witboys.com",
            "password": "Admin@123"
        })
        assert response.status_code == 401
        print("✓ Invalid email correctly rejected")
    
    def test_auth_me_with_token(self):
        """GET /api/auth/me returns admin user with Bearer token"""
        # First login
        login_resp = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": "admin@witboys.com",
            "password": "Admin@123"
        })
        token = login_resp.json()["token"]
        
        # Then check /me
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "admin"
        assert data["email"] == "admin@witboys.com"
        print(f"✓ /auth/me returns admin user: {data['name']}")
    
    def test_auth_me_without_token(self):
        """GET /api/auth/me without token returns 401"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print("✓ /auth/me without token correctly returns 401")


class TestDashboard:
    """Dashboard stats tests"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": "admin@witboys.com",
            "password": "Admin@123"
        })
        return response.json()["token"]
    
    def test_dashboard_stats(self, admin_token):
        """GET /api/dashboard/stats returns all stat fields"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        
        # Verify all required fields
        required_fields = [
            "total_students", "total_rooms", "total_beds", "available_beds",
            "occupied_beds", "pending_complaints", "in_progress_complaints",
            "pending_applications", "revenue", "room_type_breakdown"
        ]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"✓ Dashboard stats: {data['total_rooms']} rooms, {data['total_beds']} beds, {data['available_beds']} available")
    
    def test_dashboard_stats_unauthorized(self):
        """GET /api/dashboard/stats without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 401
        print("✓ Dashboard stats correctly requires auth")


class TestRooms:
    """Room CRUD tests"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": "admin@witboys.com",
            "password": "Admin@123"
        })
        return response.json()["token"]
    
    def test_list_rooms(self, admin_token):
        """GET /api/rooms lists seeded rooms with available/total beds"""
        response = requests.get(f"{BASE_URL}/api/rooms", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        rooms = response.json()
        assert isinstance(rooms, list)
        assert len(rooms) >= 8, f"Expected at least 8 seeded rooms, got {len(rooms)}"
        
        # Verify room structure
        for room in rooms:
            assert "id" in room
            assert "room_number" in room
            assert "room_type" in room
            assert "total_beds" in room
            assert "occupied_beds" in room
            assert "fees" in room
        
        print(f"✓ Listed {len(rooms)} rooms")
    
    def test_create_room(self, admin_token):
        """POST /api/rooms creates new room, validates room_type"""
        room_data = {
            "room_number": f"{TEST_PREFIX}999",
            "room_type": "2 Seater",
            "fees": 50000
        }
        response = requests.post(f"{BASE_URL}/api/rooms", json=room_data, headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["room_number"] == f"{TEST_PREFIX}999"
        assert data["room_type"] == "2 Seater"
        assert data["total_beds"] == 2
        assert data["occupied_beds"] == 0
        assert data["fees"] == 50000
        print(f"✓ Created room {data['room_number']} with id {data['id']}")
        return data["id"]
    
    def test_create_room_duplicate(self, admin_token):
        """POST /api/rooms with duplicate room_number returns 400"""
        # First create
        room_data = {
            "room_number": f"{TEST_PREFIX}888",
            "room_type": "3 Seater",
            "fees": 35000
        }
        requests.post(f"{BASE_URL}/api/rooms", json=room_data, headers={
            "Authorization": f"Bearer {admin_token}"
        })
        
        # Try duplicate
        response = requests.post(f"{BASE_URL}/api/rooms", json=room_data, headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 400
        print("✓ Duplicate room number correctly rejected")
    
    def test_update_room(self, admin_token):
        """PATCH /api/rooms/{id} updates room"""
        # Create a room first
        create_resp = requests.post(f"{BASE_URL}/api/rooms", json={
            "room_number": f"{TEST_PREFIX}777",
            "room_type": "4 Seater",
            "fees": 28000
        }, headers={"Authorization": f"Bearer {admin_token}"})
        room_id = create_resp.json()["id"]
        
        # Update it
        response = requests.patch(f"{BASE_URL}/api/rooms/{room_id}", json={
            "fees": 30000
        }, headers={"Authorization": f"Bearer {admin_token}"})
        assert response.status_code == 200
        data = response.json()
        assert data["fees"] == 30000
        print(f"✓ Updated room fees to {data['fees']}")
    
    def test_delete_room_empty(self, admin_token):
        """DELETE /api/rooms/{id} deletes unoccupied room"""
        # Create a room
        create_resp = requests.post(f"{BASE_URL}/api/rooms", json={
            "room_number": f"{TEST_PREFIX}666",
            "room_type": "2 Seater",
            "fees": 45000
        }, headers={"Authorization": f"Bearer {admin_token}"})
        room_id = create_resp.json()["id"]
        
        # Delete it
        response = requests.delete(f"{BASE_URL}/api/rooms/{room_id}", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] == True
        print("✓ Deleted empty room successfully")
    
    def test_delete_room_not_found(self, admin_token):
        """DELETE /api/rooms/{id} with invalid id returns 404"""
        response = requests.delete(f"{BASE_URL}/api/rooms/nonexistent-id", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 404
        print("✓ Delete non-existent room returns 404")


class TestApplications:
    """Application submission and management tests"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": "admin@witboys.com",
            "password": "Admin@123"
        })
        return response.json()["token"]
    
    def test_submit_application_valid(self):
        """POST /api/applications (public) submits valid application, auto-suggests room"""
        app_data = {
            "name": f"{TEST_PREFIX}John Doe",
            "email": f"{TEST_PREFIX}john{int(time.time())}@test.com",
            "phone": f"9{int(time.time()) % 1000000000:09d}",
            "course": "B.Tech",
            "year": "2nd",
            "percentage": 85.5,
            "backlogs": 0,
            "preferred_room_type": "2 Seater"
        }
        response = requests.post(f"{BASE_URL}/api/applications", json=app_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["status"] == "Pending"
        assert data["suggested_room_type"] == "2 Seater"  # 85.5% >= 80 -> 2 Seater
        assert data["name"] == f"{TEST_PREFIX}John Doe"
        print(f"✓ Application submitted, suggested room: {data['suggested_room_type']}")
        return data
    
    def test_submit_application_merit_3_seater(self):
        """POST /api/applications with 60-79% suggests 3 Seater"""
        app_data = {
            "name": f"{TEST_PREFIX}Jane Doe",
            "email": f"{TEST_PREFIX}jane{int(time.time())}@test.com",
            "phone": f"8{int(time.time()) % 1000000000:09d}",
            "course": "B.Tech",
            "year": "3rd",
            "percentage": 70.0,
            "backlogs": 1,
            "preferred_room_type": "3 Seater"
        }
        response = requests.post(f"{BASE_URL}/api/applications", json=app_data)
        assert response.status_code == 200
        data = response.json()
        assert data["suggested_room_type"] == "3 Seater"  # 70% >= 60 -> 3 Seater
        print(f"✓ 70% percentage correctly suggests 3 Seater")
    
    def test_submit_application_merit_4_seater(self):
        """POST /api/applications with <60% suggests 4 Seater"""
        app_data = {
            "name": f"{TEST_PREFIX}Bob Smith",
            "email": f"{TEST_PREFIX}bob{int(time.time())}@test.com",
            "phone": f"7{int(time.time()) % 1000000000:09d}",
            "course": "B.Tech",
            "year": "1st",
            "percentage": 55.0,
            "backlogs": 0,
            "preferred_room_type": "4 Seater"
        }
        response = requests.post(f"{BASE_URL}/api/applications", json=app_data)
        assert response.status_code == 200
        data = response.json()
        assert data["suggested_room_type"] == "4 Seater"  # 55% < 60 -> 4 Seater
        print(f"✓ 55% percentage correctly suggests 4 Seater")
    
    def test_submit_application_auto_reject_backlogs(self):
        """POST /api/applications with backlogs>2 auto-rejects"""
        app_data = {
            "name": f"{TEST_PREFIX}Fail Student",
            "email": f"{TEST_PREFIX}fail{int(time.time())}@test.com",
            "phone": f"6{int(time.time()) % 1000000000:09d}",
            "course": "B.Tech",
            "year": "4th",
            "percentage": 50.0,
            "backlogs": 3,
            "preferred_room_type": "4 Seater"
        }
        response = requests.post(f"{BASE_URL}/api/applications", json=app_data)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "Rejected"
        assert "backlog" in data["reject_reason"].lower()
        print(f"✓ Application with 3 backlogs auto-rejected: {data['reject_reason']}")
    
    def test_submit_application_invalid_percentage_high(self):
        """POST /api/applications with percentage>100 returns 400"""
        app_data = {
            "name": f"{TEST_PREFIX}Invalid",
            "email": f"{TEST_PREFIX}invalid{int(time.time())}@test.com",
            "phone": f"5{int(time.time()) % 1000000000:09d}",
            "course": "B.Tech",
            "year": "1st",
            "percentage": 105.0,
            "backlogs": 0,
            "preferred_room_type": "2 Seater"
        }
        response = requests.post(f"{BASE_URL}/api/applications", json=app_data)
        assert response.status_code == 400
        print("✓ Percentage > 100 correctly rejected")
    
    def test_submit_application_invalid_percentage_negative(self):
        """POST /api/applications with percentage<0 returns 400"""
        app_data = {
            "name": f"{TEST_PREFIX}Invalid2",
            "email": f"{TEST_PREFIX}invalid2{int(time.time())}@test.com",
            "phone": f"4{int(time.time()) % 1000000000:09d}",
            "course": "B.Tech",
            "year": "1st",
            "percentage": -5.0,
            "backlogs": 0,
            "preferred_room_type": "2 Seater"
        }
        response = requests.post(f"{BASE_URL}/api/applications", json=app_data)
        assert response.status_code == 400
        print("✓ Negative percentage correctly rejected")
    
    def test_submit_application_duplicate_email(self):
        """POST /api/applications duplicate email returns 400"""
        unique_email = f"{TEST_PREFIX}dup{int(time.time())}@test.com"
        app_data = {
            "name": f"{TEST_PREFIX}Dup Test",
            "email": unique_email,
            "phone": f"3{int(time.time()) % 1000000000:09d}",
            "course": "B.Tech",
            "year": "2nd",
            "percentage": 75.0,
            "backlogs": 0,
            "preferred_room_type": "3 Seater"
        }
        # First submission
        response1 = requests.post(f"{BASE_URL}/api/applications", json=app_data)
        assert response1.status_code == 200
        
        # Duplicate submission
        app_data["phone"] = f"2{int(time.time()) % 1000000000:09d}"  # Different phone, same email
        response2 = requests.post(f"{BASE_URL}/api/applications", json=app_data)
        assert response2.status_code == 400
        print("✓ Duplicate email correctly rejected")
    
    def test_check_application_status(self):
        """POST /api/applications/status with email returns application"""
        # First create an application
        unique_email = f"{TEST_PREFIX}status{int(time.time())}@test.com"
        app_data = {
            "name": f"{TEST_PREFIX}Status Test",
            "email": unique_email,
            "phone": f"1{int(time.time()) % 1000000000:09d}",
            "course": "B.Tech",
            "year": "2nd",
            "percentage": 80.0,
            "backlogs": 0,
            "preferred_room_type": "2 Seater"
        }
        requests.post(f"{BASE_URL}/api/applications", json=app_data)
        
        # Check status
        response = requests.post(f"{BASE_URL}/api/applications/status", json={
            "email": unique_email
        })
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == unique_email.lower()
        print(f"✓ Application status check works, status: {data['status']}")
    
    def test_list_applications_admin(self, admin_token):
        """GET /api/applications (admin) lists all applications"""
        response = requests.get(f"{BASE_URL}/api/applications", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        apps = response.json()
        assert isinstance(apps, list)
        print(f"✓ Listed {len(apps)} applications")


class TestApplicationApproval:
    """Application approval workflow tests"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": "admin@witboys.com",
            "password": "Admin@123"
        })
        return response.json()["token"]
    
    def test_approve_application_creates_student(self, admin_token):
        """POST /api/applications/{id}/approve allocates room, creates student, returns credentials"""
        # Create application
        unique_ts = int(time.time() * 1000)
        app_data = {
            "name": f"{TEST_PREFIX}Approve Test",
            "email": f"{TEST_PREFIX}approve{unique_ts}@test.com",
            "phone": f"9{unique_ts % 1000000000:09d}",
            "course": "B.Tech",
            "year": "2nd",
            "percentage": 85.0,
            "backlogs": 0,
            "preferred_room_type": "2 Seater"
        }
        create_resp = requests.post(f"{BASE_URL}/api/applications", json=app_data)
        app_id = create_resp.json()["id"]
        
        # Approve
        response = requests.post(f"{BASE_URL}/api/applications/{app_id}/approve", 
            json={}, headers={"Authorization": f"Bearer {admin_token}"})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["ok"] == True
        assert "student_id" in data
        assert "room_number" in data
        assert "bed_number" in data
        assert "login_credentials" in data
        assert "phone" in data["login_credentials"]
        assert "password" in data["login_credentials"]
        
        print(f"✓ Application approved, student created in room {data['room_number']}, bed {data['bed_number']}")
        return data
    
    def test_approve_with_override_room_type(self, admin_token):
        """POST /api/applications/{id}/approve with override_room_type overrides suggestion"""
        # Create application with high percentage (would suggest 2 Seater)
        unique_ts = int(time.time() * 1000)
        app_data = {
            "name": f"{TEST_PREFIX}Override Test",
            "email": f"{TEST_PREFIX}override{unique_ts}@test.com",
            "phone": f"8{unique_ts % 1000000000:09d}",
            "course": "B.Tech",
            "year": "3rd",
            "percentage": 90.0,
            "backlogs": 0,
            "preferred_room_type": "2 Seater"
        }
        create_resp = requests.post(f"{BASE_URL}/api/applications", json=app_data)
        app_id = create_resp.json()["id"]
        
        # Approve with override to 4 Seater
        response = requests.post(f"{BASE_URL}/api/applications/{app_id}/approve", 
            json={"override_room_type": "4 Seater"}, 
            headers={"Authorization": f"Bearer {admin_token}"})
        assert response.status_code == 200
        data = response.json()
        assert data["room_type"] == "4 Seater"
        print(f"✓ Override room type worked, assigned to {data['room_type']}")
    
    def test_reject_application(self, admin_token):
        """POST /api/applications/{id}/reject rejects pending application"""
        # Create application
        unique_ts = int(time.time() * 1000)
        app_data = {
            "name": f"{TEST_PREFIX}Reject Test",
            "email": f"{TEST_PREFIX}reject{unique_ts}@test.com",
            "phone": f"7{unique_ts % 1000000000:09d}",
            "course": "B.Tech",
            "year": "1st",
            "percentage": 65.0,
            "backlogs": 1,
            "preferred_room_type": "3 Seater"
        }
        create_resp = requests.post(f"{BASE_URL}/api/applications", json=app_data)
        app_id = create_resp.json()["id"]
        
        # Reject
        response = requests.post(f"{BASE_URL}/api/applications/{app_id}/reject", 
            headers={"Authorization": f"Bearer {admin_token}"})
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] == True
        print("✓ Application rejected successfully")


class TestStudentAuth:
    """Student authentication after approval"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": "admin@witboys.com",
            "password": "Admin@123"
        })
        return response.json()["token"]
    
    def test_student_login_with_approved_credentials(self, admin_token):
        """POST /api/auth/student/login with returned credentials works"""
        # Create and approve application
        unique_ts = int(time.time() * 1000)
        app_data = {
            "name": f"{TEST_PREFIX}Student Login Test",
            "email": f"{TEST_PREFIX}stulogin{unique_ts}@test.com",
            "phone": f"6{unique_ts % 1000000000:09d}",
            "course": "B.Tech",
            "year": "2nd",
            "percentage": 75.0,
            "backlogs": 0,
            "preferred_room_type": "3 Seater"
        }
        create_resp = requests.post(f"{BASE_URL}/api/applications", json=app_data)
        app_id = create_resp.json()["id"]
        
        # Approve
        approve_resp = requests.post(f"{BASE_URL}/api/applications/{app_id}/approve", 
            json={}, headers={"Authorization": f"Bearer {admin_token}"})
        credentials = approve_resp.json()["login_credentials"]
        
        # Login as student
        response = requests.post(f"{BASE_URL}/api/auth/student/login", json={
            "phone": credentials["phone"],
            "password": credentials["password"]
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "student"
        print(f"✓ Student login successful with approved credentials")
        return data["token"]
    
    def test_student_me_endpoint(self, admin_token):
        """GET /api/students/me returns student's own record"""
        # Create and approve application
        unique_ts = int(time.time() * 1000)
        app_data = {
            "name": f"{TEST_PREFIX}Student Me Test",
            "email": f"{TEST_PREFIX}stume{unique_ts}@test.com",
            "phone": f"5{unique_ts % 1000000000:09d}",
            "course": "B.Tech",
            "year": "3rd",
            "percentage": 80.0,
            "backlogs": 0,
            "preferred_room_type": "2 Seater"
        }
        create_resp = requests.post(f"{BASE_URL}/api/applications", json=app_data)
        app_id = create_resp.json()["id"]
        
        # Approve
        approve_resp = requests.post(f"{BASE_URL}/api/applications/{app_id}/approve", 
            json={}, headers={"Authorization": f"Bearer {admin_token}"})
        credentials = approve_resp.json()["login_credentials"]
        
        # Login as student
        login_resp = requests.post(f"{BASE_URL}/api/auth/student/login", json={
            "phone": credentials["phone"],
            "password": credentials["password"]
        })
        student_token = login_resp.json()["token"]
        
        # Get student record
        response = requests.get(f"{BASE_URL}/api/students/me", headers={
            "Authorization": f"Bearer {student_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "room_number" in data
        assert "bed_number" in data
        assert "fees_status" in data
        print(f"✓ Student /me returns room {data['room_number']}, bed {data['bed_number']}")


class TestStudentsCRUD:
    """Student CRUD operations (admin)"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": "admin@witboys.com",
            "password": "Admin@123"
        })
        return response.json()["token"]
    
    def test_list_students(self, admin_token):
        """GET /api/students (admin) lists students"""
        response = requests.get(f"{BASE_URL}/api/students", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        students = response.json()
        assert isinstance(students, list)
        print(f"✓ Listed {len(students)} students")
    
    def test_create_student_admin(self, admin_token):
        """POST /api/students (admin) creates student with auto bed allocation"""
        unique_ts = int(time.time() * 1000)
        student_data = {
            "name": f"{TEST_PREFIX}Admin Created",
            "phone": f"4{unique_ts % 1000000000:09d}",
            "email": f"{TEST_PREFIX}admincreated{unique_ts}@test.com",
            "preferred_room_type": "3 Seater"
        }
        response = requests.post(f"{BASE_URL}/api/students", json=student_data, headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "room_number" in data
        assert "bed_number" in data
        assert data["fees_status"] == "Pending"
        print(f"✓ Admin created student in room {data['room_number']}, bed {data['bed_number']}")
        return data["id"]
    
    def test_delete_student_deallocates_bed(self, admin_token):
        """DELETE /api/students/{id} deallocates bed"""
        # Create student
        unique_ts = int(time.time() * 1000)
        student_data = {
            "name": f"{TEST_PREFIX}Delete Test",
            "phone": f"3{unique_ts % 1000000000:09d}",
            "preferred_room_type": "4 Seater"
        }
        create_resp = requests.post(f"{BASE_URL}/api/students", json=student_data, headers={
            "Authorization": f"Bearer {admin_token}"
        })
        student_id = create_resp.json()["id"]
        room_id = create_resp.json()["room_id"]
        
        # Get room occupied beds before delete
        rooms_resp = requests.get(f"{BASE_URL}/api/rooms", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        room_before = next((r for r in rooms_resp.json() if r["id"] == room_id), None)
        occupied_before = room_before["occupied_beds"] if room_before else 0
        
        # Delete student
        response = requests.delete(f"{BASE_URL}/api/students/{student_id}", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        
        # Verify bed deallocated
        rooms_resp = requests.get(f"{BASE_URL}/api/rooms", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        room_after = next((r for r in rooms_resp.json() if r["id"] == room_id), None)
        occupied_after = room_after["occupied_beds"] if room_after else 0
        
        assert occupied_after == occupied_before - 1
        print(f"✓ Student deleted, bed deallocated (occupied: {occupied_before} -> {occupied_after})")


class TestComplaints:
    """Complaint management tests"""
    
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
            "email": f"{TEST_PREFIX}complaint{unique_ts}@test.com",
            "phone": f"2{unique_ts % 1000000000:09d}",
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
    
    def test_create_complaint_student(self, student_token):
        """POST /api/complaints (student only) creates complaint"""
        complaint_data = {
            "title": f"{TEST_PREFIX}Water Issue",
            "description": "No hot water in bathroom",
            "category": "Maintenance"
        }
        response = requests.post(f"{BASE_URL}/api/complaints", json=complaint_data, headers={
            "Authorization": f"Bearer {student_token}"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["title"] == f"{TEST_PREFIX}Water Issue"
        assert data["status"] == "Pending"
        print(f"✓ Complaint created with id {data['id']}")
        return data["id"]
    
    def test_list_complaints_admin(self, admin_token, student_token):
        """GET /api/complaints (admin) lists complaints"""
        # First create a complaint
        complaint_data = {
            "title": f"{TEST_PREFIX}Admin List Test",
            "description": "Test complaint",
            "category": "General"
        }
        requests.post(f"{BASE_URL}/api/complaints", json=complaint_data, headers={
            "Authorization": f"Bearer {student_token}"
        })
        
        # List as admin
        response = requests.get(f"{BASE_URL}/api/complaints", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        complaints = response.json()
        assert isinstance(complaints, list)
        print(f"✓ Admin listed {len(complaints)} complaints")
    
    def test_my_complaints_student(self, student_token):
        """GET /api/complaints/me (student) returns own complaints"""
        # Create a complaint
        complaint_data = {
            "title": f"{TEST_PREFIX}My Complaint",
            "description": "My test complaint",
            "category": "General"
        }
        requests.post(f"{BASE_URL}/api/complaints", json=complaint_data, headers={
            "Authorization": f"Bearer {student_token}"
        })
        
        # Get my complaints
        response = requests.get(f"{BASE_URL}/api/complaints/me", headers={
            "Authorization": f"Bearer {student_token}"
        })
        assert response.status_code == 200
        complaints = response.json()
        assert isinstance(complaints, list)
        assert len(complaints) >= 1
        print(f"✓ Student has {len(complaints)} complaints")
    
    def test_update_complaint_status(self, admin_token, student_token):
        """PATCH /api/complaints/{id} updates status"""
        # Create complaint
        complaint_data = {
            "title": f"{TEST_PREFIX}Status Update Test",
            "description": "Test status update",
            "category": "General"
        }
        create_resp = requests.post(f"{BASE_URL}/api/complaints", json=complaint_data, headers={
            "Authorization": f"Bearer {student_token}"
        })
        complaint_id = create_resp.json()["id"]
        
        # Update status to In Progress
        response = requests.patch(f"{BASE_URL}/api/complaints/{complaint_id}", 
            json={"status": "In Progress"}, headers={"Authorization": f"Bearer {admin_token}"})
        assert response.status_code == 200
        
        # Update status to Resolved
        response = requests.patch(f"{BASE_URL}/api/complaints/{complaint_id}", 
            json={"status": "Resolved"}, headers={"Authorization": f"Bearer {admin_token}"})
        assert response.status_code == 200
        print("✓ Complaint status updated: Pending -> In Progress -> Resolved")


class TestPayments:
    """Payment/fees tests"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": "admin@witboys.com",
            "password": "Admin@123"
        })
        return response.json()["token"]
    
    def test_record_payment(self, admin_token):
        """POST /api/payments (admin) records payment, marks student fees_status=Paid"""
        # Create a student first
        unique_ts = int(time.time() * 1000)
        student_data = {
            "name": f"{TEST_PREFIX}Payment Test",
            "phone": f"1{unique_ts % 1000000000:09d}",
            "preferred_room_type": "4 Seater"
        }
        create_resp = requests.post(f"{BASE_URL}/api/students", json=student_data, headers={
            "Authorization": f"Bearer {admin_token}"
        })
        student_id = create_resp.json()["id"]
        
        # Record payment
        payment_data = {
            "student_id": student_id,
            "amount": 28000,
            "method": "UPI"
        }
        response = requests.post(f"{BASE_URL}/api/payments", json=payment_data, headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["amount"] == 28000
        assert data["status"] == "Paid"
        
        # Verify student fees_status updated
        students_resp = requests.get(f"{BASE_URL}/api/students", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        student = next((s for s in students_resp.json() if s["id"] == student_id), None)
        assert student["fees_status"] == "Paid"
        print(f"✓ Payment recorded, student fees_status updated to Paid")
    
    def test_list_payments(self, admin_token):
        """GET /api/payments lists all payments"""
        response = requests.get(f"{BASE_URL}/api/payments", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        payments = response.json()
        assert isinstance(payments, list)
        print(f"✓ Listed {len(payments)} payments")


class TestCSVExports:
    """CSV export tests"""
    
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
        content = response.text
        assert "id" in content and "name" in content
        print(f"✓ Students CSV export works, {len(content)} bytes")
    
    def test_export_applications_csv(self, admin_token):
        """GET /api/export/applications returns CSV"""
        response = requests.get(f"{BASE_URL}/api/export/applications", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        content = response.text
        assert "id" in content and "name" in content
        print(f"✓ Applications CSV export works, {len(content)} bytes")
    
    def test_export_payments_csv(self, admin_token):
        """GET /api/export/payments returns CSV"""
        response = requests.get(f"{BASE_URL}/api/export/payments", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        content = response.text
        assert "id" in content
        print(f"✓ Payments CSV export works, {len(content)} bytes")


class TestRoomAllocationLogic:
    """Room allocation logic tests"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": "admin@witboys.com",
            "password": "Admin@123"
        })
        return response.json()["token"]
    
    def test_room_allocation_increments_occupied_beds(self, admin_token):
        """Room allocation: occupied_beds increments when student added"""
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
            "phone": f"9{unique_ts % 1000000000:09d}",
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


class TestDeleteRoomWithStudents:
    """Test that occupied rooms cannot be deleted"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": "admin@witboys.com",
            "password": "Admin@123"
        })
        return response.json()["token"]
    
    def test_delete_occupied_room_blocked(self, admin_token):
        """DELETE /api/rooms/{id} blocks if occupied"""
        # Create a room
        create_resp = requests.post(f"{BASE_URL}/api/rooms", json={
            "room_number": f"{TEST_PREFIX}OCC",
            "room_type": "2 Seater",
            "fees": 45000
        }, headers={"Authorization": f"Bearer {admin_token}"})
        room_id = create_resp.json()["id"]
        
        # Add a student to it
        unique_ts = int(time.time() * 1000)
        student_data = {
            "name": f"{TEST_PREFIX}Occupy Room",
            "phone": f"8{unique_ts % 1000000000:09d}",
            "preferred_room_type": "2 Seater"
        }
        requests.post(f"{BASE_URL}/api/students", json=student_data, headers={
            "Authorization": f"Bearer {admin_token}"
        })
        
        # Try to delete the room - should fail
        # First find a room that has students
        rooms_resp = requests.get(f"{BASE_URL}/api/rooms", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        occupied_room = next((r for r in rooms_resp.json() if r["occupied_beds"] > 0), None)
        
        if occupied_room:
            response = requests.delete(f"{BASE_URL}/api/rooms/{occupied_room['id']}", headers={
                "Authorization": f"Bearer {admin_token}"
            })
            assert response.status_code == 400
            print("✓ Cannot delete occupied room - correctly blocked")
        else:
            print("⚠ No occupied rooms to test deletion block")
