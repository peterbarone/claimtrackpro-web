-- ClaimTrackPRO Database Schema
--
-- This SQL file defines the tables and relationships used in the ClaimTrackPRO data model.
-- It is written in generic SQL; adapt data types (e.g., UUID) to your chosen database engine.

-- ====================================================================
-- Addresses
-- Stores normalized postal addresses used by carriers, insureds, policies and claims
-- ====================================================================
CREATE TABLE addresses (
    id           VARCHAR(36) PRIMARY KEY,
    label        VARCHAR(255),
    street_1     VARCHAR(255),
    street_2     VARCHAR(255),
    city         VARCHAR(100),
    state        VARCHAR(100),
    postal_code  VARCHAR(20),
    county       VARCHAR(100),
    country      VARCHAR(100)
);

-- ====================================================================
-- Carriers
-- Represents insurance carriers
-- ====================================================================
CREATE TABLE carriers (
    id                  VARCHAR(36) PRIMARY KEY,
    address_id          VARCHAR(36) REFERENCES addresses(id),
    name                VARCHAR(255) NOT NULL,
    naic                VARCHAR(50),
    phone               VARCHAR(50),
    email               VARCHAR(255),
    claims_email_intake VARCHAR(255)
);

-- ====================================================================
-- Claim Documents
-- Stores files attached to a claim
-- ====================================================================
CREATE TABLE claim_documents (
    id           VARCHAR(36) PRIMARY KEY,
    claim_id     VARCHAR(36) REFERENCES claims(id),
    file_id      VARCHAR(36), -- stores Directus file identifier
    category     VARCHAR(100),
    uploaded_by  VARCHAR(36) REFERENCES staff(id),
    uploaded_at  TIMESTAMP,
    notes        TEXT
);

-- ====================================================================
-- Claim Events
-- Records system or workflow events on a claim
-- ====================================================================
CREATE TABLE claim_events (
    id           VARCHAR(36) PRIMARY KEY,
    claim_id     VARCHAR(36) REFERENCES claims(id),
    payload      TEXT, -- JSON or serialized payload
    event_type   VARCHAR(100),
    created_at   TIMESTAMP,
    created_by   VARCHAR(36) REFERENCES staff(id)
);

-- ====================================================================
-- Claim Notes
-- Stores notes associated with claims
-- ====================================================================
CREATE TABLE claim_notes (
    id           VARCHAR(36) PRIMARY KEY,
    claim_id     VARCHAR(36) REFERENCES claims(id),
    visibility   VARCHAR(50), -- e.g. 'internal', 'external'
    created_by   VARCHAR(36) REFERENCES staff(id),
    created_at   TIMESTAMP,
    note         TEXT
);

-- ====================================================================
-- Claim Status Lookup
-- Defines possible statuses for claims
-- ====================================================================
CREATE TABLE claim_status (
    id     SERIAL PRIMARY KEY, -- integer lookup; adjust type as needed
    name   VARCHAR(100) NOT NULL,
    sort   INTEGER
);

-- ====================================================================
-- Claim Tasks
-- Tasks linked to a claim for workflow management
-- ====================================================================
CREATE TABLE claim_tasks (
    id         VARCHAR(36) PRIMARY KEY,
    claim_id   VARCHAR(36) REFERENCES claims(id) ON DELETE CASCADE,
    status     VARCHAR(50), -- consider separate lookup
    priority   VARCHAR(50), -- consider separate lookup
    assignee   VARCHAR(36) REFERENCES staff(id),
    title      VARCHAR(255) NOT NULL,
    details    TEXT,
    due_date   DATE
);

-- ====================================================================
-- Claim Type Lookup
-- Defines possible claim types (e.g., property, auto)
-- ====================================================================
CREATE TABLE claim_type (
    id     SERIAL PRIMARY KEY,
    name   VARCHAR(100) NOT NULL,
    sort   INTEGER
);

-- ====================================================================
-- Claims
-- Core claim record connecting carriers, policies, insureds and lookup tables
-- ====================================================================
CREATE TABLE claims (
    id                VARCHAR(36) PRIMARY KEY,
    claim_number      VARCHAR(100) NOT NULL,
    display_id        VARCHAR(100),
    carrier_id        VARCHAR(36) REFERENCES carriers(id),
    policy_id         VARCHAR(36) REFERENCES policies(id),
    claim_type_id     INTEGER REFERENCES claim_type(id),
    status_id         INTEGER REFERENCES claim_status(id),
    loss_cause_id     INTEGER REFERENCES loss_cause(id),
    primary_insured   VARCHAR(36) REFERENCES insureds(id),
    secondary_insured VARCHAR(36) REFERENCES insureds(id),
    loss_location     VARCHAR(36) REFERENCES addresses(id),
    assigned_to_user  VARCHAR(36) REFERENCES staff(id),
    date_of_loss      DATE,
    reported_date     DATE,
    closed_date       DATE,
    deductible        DECIMAL(12,2),
    reserve_amount    DECIMAL(12,2),
    description       TEXT,
    created_by        VARCHAR(36) REFERENCES staff(id),
    updated_by        VARCHAR(36) REFERENCES staff(id)
);

-- ====================================================================
-- Claims Contacts Junction
-- Links claims to additional contacts
-- ====================================================================
CREATE TABLE claims_contacts (
    id         VARCHAR(36) PRIMARY KEY,
    claims_id  VARCHAR(36) REFERENCES claims(id) ON DELETE CASCADE,
    contacts_id VARCHAR(36) REFERENCES contacts(id) ON DELETE CASCADE
);

-- ====================================================================
-- Contacts
-- Stores contact information for clients, attorneys, contractors, etc.
-- ====================================================================
CREATE TABLE contacts (
    id         VARCHAR(36) PRIMARY KEY,
    role       VARCHAR(50),
    first_name VARCHAR(100),
    last_name  VARCHAR(100),
    company    VARCHAR(150),
    phone      VARCHAR(50),
    email      VARCHAR(255),
    notes      TEXT
);

-- ====================================================================
-- Insureds
-- Represents primary or secondary insured parties
-- ====================================================================
CREATE TABLE insureds (
    id             VARCHAR(36) PRIMARY KEY,
    type           VARCHAR(50), -- e.g. 'person' or 'organization'
    mailing_address VARCHAR(36) REFERENCES addresses(id),
    first_name     VARCHAR(100),
    last_name      VARCHAR(100),
    org_name       VARCHAR(150),
    primary_phone  VARCHAR(50),
    primary_email  VARCHAR(255),
    alt_phone      VARCHAR(50),
    alt_email      VARCHAR(255)
);

-- ====================================================================
-- Loss Cause Lookup
-- Defines possible causes of loss (fire, water, etc.)
-- ====================================================================
CREATE TABLE loss_cause (
    id     SERIAL PRIMARY KEY,
    name   VARCHAR(100) NOT NULL,
    sort   INTEGER
);

-- ====================================================================
-- Policies
-- Stores insurance policies linked to carriers and insureds
-- ====================================================================
CREATE TABLE policies (
    id             VARCHAR(36) PRIMARY KEY,
    carrier_id     VARCHAR(36) REFERENCES carriers(id),
    named_insured  VARCHAR(36) REFERENCES insureds(id),
    policy_type    VARCHAR(100),
    policy_number  VARCHAR(100),
    effective_date DATE,
    expiration_date DATE
);

-- ====================================================================
-- Roles (Directus roles)
-- Defines system permission roles
-- ====================================================================
CREATE TABLE roles (
    id          VARCHAR(36) PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    key         VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

-- ====================================================================
-- Staff
-- Stores employees or contractors working on claims
-- ====================================================================
CREATE TABLE staff (
    id            VARCHAR(36) PRIMARY KEY,
    status        VARCHAR(50),
    sort          INTEGER,
    user_created  VARCHAR(36), -- references directus_users if available
    date_created  TIMESTAMP,
    user_updated  VARCHAR(36), -- references directus_users if available
    date_updated  TIMESTAMP,
    first_name    VARCHAR(100),
    last_name     VARCHAR(100),
    email         VARCHAR(255),
    phone         VARCHAR(50),
    is_1099       BOOLEAN,
    user          VARCHAR(36) -- references directus_users.id
);

-- ====================================================================
-- Staff Roles Junction
-- Links staff members to system roles
-- ====================================================================
CREATE TABLE staff_roles (
    id            VARCHAR(36) PRIMARY KEY,
    status        VARCHAR(50),
    sort          INTEGER,
    user_created  VARCHAR(36),
    date_created  TIMESTAMP,
    user_updated  VARCHAR(36),
    date_updated  TIMESTAMP,
    staff_id      VARCHAR(36) REFERENCES staff(id) ON DELETE CASCADE,
    role_id       VARCHAR(36) REFERENCES roles(id) ON DELETE SET NULL
);

-- ====================================================================
-- Indexes
-- Add indexes to improve performance on foreign key columns
-- ====================================================================
CREATE INDEX idx_carriers_address_id ON carriers(address_id);
CREATE INDEX idx_claims_carrier_id ON claims(carrier_id);
CREATE INDEX idx_claims_policy_id ON claims(policy_id);
CREATE INDEX idx_claims_claim_type_id ON claims(claim_type_id);
CREATE INDEX idx_claims_status_id ON claims(status_id);
CREATE INDEX idx_claims_loss_cause_id ON claims(loss_cause_id);
CREATE INDEX idx_claims_primary_insured ON claims(primary_insured);
CREATE INDEX idx_claims_secondary_insured ON claims(secondary_insured);
CREATE INDEX idx_claims_loss_location ON claims(loss_location);
CREATE INDEX idx_claims_assigned_to_user ON claims(assigned_to_user);
CREATE INDEX idx_claim_tasks_claim_id ON claim_tasks(claim_id);
CREATE INDEX idx_claim_notes_claim_id ON claim_notes(claim_id);
CREATE INDEX idx_claim_documents_claim_id ON claim_documents(claim_id);
CREATE INDEX idx_claim_events_claim_id ON claim_events(claim_id);
CREATE INDEX idx_claims_contacts_claims_id ON claims_contacts(claims_id);
CREATE INDEX idx_claims_contacts_contacts_id ON claims_contacts(contacts_id);
CREATE INDEX idx_policies_carrier_id ON policies(carrier_id);
CREATE INDEX idx_policies_named_insured ON policies(named_insured);
CREATE INDEX idx_staff_roles_staff_id ON staff_roles(staff_id);
CREATE INDEX idx_staff_roles_role_id ON staff_roles(role_id);
