-- WIT Hostel — MySQL 8+ schema (utf8mb4)
-- Run once: mysql -u USER -p < schema.sql
-- Or: CREATE DATABASE wit_hostel_db; USE wit_hostel_db; then paste below.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS payment_orders;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS complaints;
DROP TABLE IF EXISTS applications;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS rooms;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
    id              CHAR(36)     NOT NULL PRIMARY KEY,
    email           VARCHAR(255) NULL,
    phone           VARCHAR(64)  NULL,
    name            VARCHAR(255) NOT NULL,
    role            VARCHAR(32)  NOT NULL COMMENT 'admin | student',
    password_hash   VARCHAR(255) NULL,
    picture         TEXT         NULL,
    auth_provider   VARCHAR(32)  NOT NULL DEFAULT 'password',
    student_id      CHAR(36)     NULL COMMENT 'links to students.id when allotted',
    created_at      DATETIME(6)  NOT NULL,
    KEY idx_users_email (email),
    KEY idx_users_phone (phone),
    KEY idx_users_role (role),
    KEY idx_users_student_id (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE rooms (
    id              CHAR(36)     NOT NULL PRIMARY KEY,
    room_number     VARCHAR(32)  NOT NULL,
    room_type       VARCHAR(32)  NOT NULL COMMENT '2 Seater | 3 Seater | 4 Seater',
    total_beds      INT          NOT NULL DEFAULT 0,
    occupied_beds   INT          NOT NULL DEFAULT 0,
    fees            DOUBLE       NOT NULL DEFAULT 0,
    created_at      DATETIME(6)  NOT NULL,
    UNIQUE KEY uq_rooms_room_number (room_number),
    KEY idx_rooms_type_beds (room_type, occupied_beds, total_beds)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE students (
    id              CHAR(36)     NOT NULL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    phone           VARCHAR(64)  NOT NULL,
    email           VARCHAR(255) NULL,
    room_id         CHAR(36)     NOT NULL,
    room_number     VARCHAR(32)  NOT NULL,
    room_type       VARCHAR(32)  NOT NULL,
    bed_number      INT          NOT NULL,
    fees_status     VARCHAR(32)  NOT NULL DEFAULT 'Pending',
    fees_amount     DOUBLE       NOT NULL DEFAULT 0,
    application_id  CHAR(36)     NULL,
    user_id         CHAR(36)     NULL,
    course          VARCHAR(255) NULL,
    year            VARCHAR(64)  NULL,
    created_at      DATETIME(6)  NOT NULL,
    KEY idx_students_user_id (user_id),
    KEY idx_students_room_id (room_id),
    CONSTRAINT fk_students_room FOREIGN KEY (room_id) REFERENCES rooms(id),
    CONSTRAINT fk_students_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE applications (
    id                      CHAR(36)     NOT NULL PRIMARY KEY,
    user_id                 CHAR(36)     NOT NULL,
    name                    VARCHAR(255) NOT NULL,
    email                   VARCHAR(255) NULL,
    phone                   VARCHAR(64)  NULL,
    course                  VARCHAR(255) NOT NULL,
    year                    VARCHAR(64)  NOT NULL,
    percentage              DOUBLE       NOT NULL,
    backlogs                INT          NOT NULL DEFAULT 0,
    preferred_room_type   VARCHAR(32)  NOT NULL,
    suggested_room_type     VARCHAR(32)  NOT NULL,
    status                  VARCHAR(32)  NOT NULL DEFAULT 'Pending',
    reject_reason           TEXT         NULL,
    assigned_room_id        CHAR(36)     NULL,
    assigned_room_number    VARCHAR(32)  NULL,
    assigned_room_type      VARCHAR(32)  NULL,
    bed_number              INT          NULL,
    merit_score             DOUBLE       NULL,
    created_at              DATETIME(6)  NOT NULL,
    override_room_type      VARCHAR(32)  NULL,
    student_id              CHAR(36)     NULL,
    approved_at             DATETIME(6)  NULL,
    waitlist_paid           TINYINT(1)   NOT NULL DEFAULT 0,
    waitlist_paid_at       DATETIME(6)  NULL,
    waitlist_payment_id     VARCHAR(255) NULL,
    priority_score          DOUBLE       NULL,
    KEY idx_applications_user (user_id),
    KEY idx_applications_status (status),
    KEY idx_applications_created (created_at),
    KEY idx_applications_email_phone (email, phone),
    CONSTRAINT fk_applications_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE complaints (
    id            CHAR(36)     NOT NULL PRIMARY KEY,
    student_id    CHAR(36)     NOT NULL,
    student_name  VARCHAR(255) NOT NULL,
    room_number   VARCHAR(32)  NULL,
    title         VARCHAR(255) NOT NULL,
    description   TEXT         NOT NULL,
    category      VARCHAR(128) NOT NULL DEFAULT 'General',
    status        VARCHAR(32)  NOT NULL DEFAULT 'Pending',
    created_at    DATETIME(6)  NOT NULL,
    updated_at    DATETIME(6)  NOT NULL,
    KEY idx_complaints_student (student_id),
    KEY idx_complaints_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE payments (
    id             CHAR(36)     NOT NULL PRIMARY KEY,
    student_id     CHAR(36)     NOT NULL,
    student_name   VARCHAR(255) NOT NULL,
    amount         DOUBLE       NOT NULL,
    status         VARCHAR(32)  NOT NULL,
    method         VARCHAR(64)  NOT NULL,
    payment_id     VARCHAR(255) NULL,
    order_id       VARCHAR(255) NULL,
    payment_date   DATETIME(6)  NOT NULL,
    KEY idx_payments_student (student_id),
    KEY idx_payments_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE payment_orders (
    order_id        VARCHAR(255) NOT NULL PRIMARY KEY,
    type            VARCHAR(64)  NOT NULL COMMENT 'hostel_fees | waitlist_deposit',
    student_id      CHAR(36)     NULL,
    application_id  CHAR(36)     NULL,
    amount          DOUBLE       NOT NULL,
    status          VARCHAR(32)  NOT NULL,
    payment_id      VARCHAR(255) NULL,
    created_at      DATETIME(6)  NOT NULL,
    KEY idx_po_student (student_id),
    KEY idx_po_application (application_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_sessions (
    session_token VARCHAR(512) NOT NULL PRIMARY KEY,
    user_id       CHAR(36)     NOT NULL,
    expires_at    DATETIME(6)  NOT NULL,
    created_at    DATETIME(6)  NOT NULL,
    KEY idx_sessions_user (user_id),
    CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
