     display: null
      display_options: null
      field: sort
      group: null
      hidden: true
      interface: input
      note: null
      options: null
      readonly: false
      required: false
      sort: 3
      special: null
      translations: null
      validation: null
      validation_message: null
      width: full
    schema:
      name: sort
      table: staff_roles
      data_type: integer
      default_value: null
      max_length: null
      numeric_precision: 32
      numeric_scale: 0
      is_nullable: true
      is_unique: false
      is_indexed: false
      is_primary_key: false
      is_generated: false
      generation_expression: null
      has_auto_increment: false
      foreign_key_table: null
      foreign_key_column: null
  - collection: staff_roles
    field: user_created
    type: uuid
    meta:
      collection: staff_roles
      conditions: null
      display: user
      display_options: null
      field: user_created
      group: null
      hidden: true
      interface: select-dropdown-m2o
      note: null
      options:
        template: '{{avatar}} {{first_name}} {{last_name}}'
      readonly: true
      required: false
      sort: 4
      special:
        - user-created
      translations: null
      validation: null
      validation_message: null
      width: half
    schema:
      name: user_created
      table: staff_roles
      data_type: uuid
      default_value: null
      max_length: null
      numeric_precision: null
      numeric_scale: null
      is_nullable: true
      is_unique: false
      is_indexed: false
      is_primary_key: false
      is_generated: false
      generation_expression: null
      has_auto_increment: false
      foreign_key_table: directus_users
      foreign_key_column: id
  - collection: staff_roles
    field: date_created
    type: timestamp
    meta:
      collection: staff_roles
      conditions: null
      display: datetime
      display_options:
        relative: true
      field: date_created
      group: null
      hidden: true
      interface: datetime
      note: null
      options: null
      readonly: true
      required: false
      sort: 5
      special:
        - date-created
      translations: null
      validation: null
      validation_message: null
      width: half
    schema:
      name: date_created
      table: staff_roles
      data_type: timestamp with time zone
      default_value: null
      max_length: null
      numeric_precision: null
      numeric_scale: null
      is_nullable: true
      is_unique: false
      is_indexed: false
      is_primary_key: false
      is_generated: false
      generation_expression: null
      has_auto_increment: false
      foreign_key_table: null
      foreign_key_column: null
  - collection: staff_roles
    field: user_updated
    type: uuid
    meta:
      collection: staff_roles
      conditions: null
      display: user
      display_options: null
      field: user_updated
      group: null
      hidden: true
      interface: select-dropdown-m2o
      note: null
      options:
        template: '{{avatar}} {{first_name}} {{last_name}}'
      readonly: true
      required: false
      sort: 6
      special:
        - user-updated
      translations: null
      validation: null
      validation_message: null
      width: half
    schema:
      name: user_updated
      table: staff_roles
      data_type: uuid
      default_value: null
      max_length: null
      numeric_precision: null
      numeric_scale: null
      is_nullable: true
      is_unique: false
      is_indexed: false
      is_primary_key: false
      is_generated: false
      generation_expression: null
      has_auto_increment: false
      foreign_key_table: directus_users
      foreign_key_column: id
  - collection: staff_roles
    field: date_updated
    type: timestamp
    meta:
      collection: staff_roles
      conditions: null
      display: datetime
      display_options:
        relative: true
      field: date_updated
      group: null
      hidden: true
      interface: datetime
      note: null
      options: null
      readonly: true
      required: false
      sort: 7
      special:
        - date-updated
      translations: null
      validation: null
      validation_message: null
      width: half
    schema:
      name: date_updated
      table: staff_roles
      data_type: timestamp with time zone
      default_value: null
      max_length: null
      numeric_precision: null
      numeric_scale: null
      is_nullable: true
      is_unique: false
      is_indexed: false
      is_primary_key: false
      is_generated: false
      generation_expression: null
      has_auto_increment: false
      foreign_key_table: null
      foreign_key_column: null
  - collection: staff_roles
    field: staff_id
    type: uuid
    meta:
      collection: staff_roles
      conditions: null
      display: null
      display_options: null
      field: staff_id
      group: null
      hidden: false
      interface: select-dropdown-m2o
      note: null
      options:
        template: '{{id}}{{last_name}}{{first_name}}'
      readonly: false
      required: false
      sort: 8
      special:
        - m2o
      translations: null
      validation: null
      validation_message: null
      width: full
    schema:
      name: staff_id
      table: staff_roles
      data_type: uuid
      default_value: null
      max_length: null
      numeric_precision: null
      numeric_scale: null
      is_nullable: true
      is_unique: false
      is_indexed: false
      is_primary_key: false
      is_generated: false
      generation_expression: null
      has_auto_increment: false
      foreign_key_table: staff
      foreign_key_column: id
  - collection: staff_roles
    field: role_id
    type: uuid
    meta:
      collection: staff_roles
      conditions: null
      display: related-values
      display_options:
        template: '{{name}}'
      field: role_id
      group: null
      hidden: false
      interface: select-dropdown-m2o
      note: null
      options:
        template: '{{id}}'
      readonly: false
      required: false
      sort: 9
      special:
        - m2o
      translations: null
      validation: null
      validation_message: null
      width: full
    schema:
      name: role_id
      table: staff_roles
      data_type: uuid
      default_value: null
      max_length: null
      numeric_precision: null
      numeric_scale: null
      is_nullable: true
      is_unique: false
      is_indexed: false
      is_primary_key: false
      is_generated: false
      generation_expression: null
      has_auto_increment: false
      foreign_key_table: roles
      foreign_key_column: id
  - collection: staff_roles
    field: roles_id
    type: uuid
    meta:
      collection: staff_roles
      conditions: null
      display: null
      display_options: null
      field: roles_id
      group: null
      hidden: true
      interface: null
      note: null
      options: null
      readonly: false
      required: false
      sort: 10
      special: null
      translations: null
      validation: null
      validation_message: null
      width: full
    schema:
      name: roles_id
      table: staff_roles
      data_type: uuid
      default_value: null
      max_length: null
      numeric_precision: null
      numeric_scale: null
      is_nullable: true
      is_unique: false
      is_indexed: false
      is_primary_key: false
      is_generated: false
      generation_expression: null
      has_auto_increment: false
      foreign_key_table: roles
      foreign_key_column: id
relations:
  - collection: carriers
    field: address
    related_collection: addresses
    meta:
      junction_field: null
      many_collection: carriers
      many_field: address
      one_allowed_collections: null
      one_collection: addresses
      one_collection_field: null
      one_deselect_action: nullify
      one_field: null
      sort_field: null
    schema:
      table: carriers
      column: address
      foreign_key_table: addresses
      foreign_key_column: id
      constraint_name: carriers_address_foreign
      on_update: NO ACTION
      on_delete: SET NULL
  - collection: claim_documents
    field: claim
    related_collection: claims
    meta:
      junction_field: null
      many_collection: claim_documents
      many_field: claim
      one_allowed_collections: null
      one_collection: claims
      one_collection_field: null
      one_deselect_action: nullify
      one_field: null
      sort_field: null
    schema:
      table: claim_documents
      column: claim
      foreign_key_table: claims
      foreign_key_column: id
      constraint_name: claim_documents_claim_foreign
      on_update: NO ACTION
      on_delete: CASCADE
  - collection: claim_documents
    field: file
    related_collection: directus_files
    meta:
      junction_field: null
      many_collection: claim_documents
      many_field: file
      one_allowed_collections: null
      one_collection: directus_files
      one_collection_field: null
      one_deselect_action: nullify
      one_field: null
      sort_field: null
    schema:
      table: claim_documents
      column: file
      foreign_key_table: directus_files
      foreign_key_column: id
      constraint_name: claim_documents_file_foreign
      on_update: NO ACTION
      on_delete: CASCADE
  - collection: claim_events
    field: claim
    related_collection: claims
    meta:
      junction_field: null
      many_collection: claim_events
      many_field: claim
      one_allowed_collections: null
      one_collection: claims
      one_collection_field: null
      one_deselect_action: nullify
      one_field: null
      sort_field: null
    schema:
      table: claim_events
      column: claim
      foreign_key_table: claims
      foreign_key_column: id
      constraint_name: claim_events_claim_foreign
      on_update: NO ACTION
      on_delete: CASCADE
  - collection: claim_notes
    field: claim
    related_collection: claims
    meta:
      junction_field: null
      many_collection: claim_notes
      many_field: claim
      one_allowed_collections: null
      one_collection: claims
      one_collection_field: null
      one_deselect_action: nullify
      one_field: null
      sort_field: null
    schema:
      table: claim_notes
      column: claim
      foreign_key_table: claims
      foreign_key_column: id
      constraint_name: claim_notes_claim_foreign
      on_update: NO ACTION
      on_delete: CASCADE
  - collection: claim_tasks
    field: claim
    related_collection: claims
    meta:
      junction_field: null
      many_collection: claim_tasks
      many_field: claim
      one_allowed_collections: null
      one_collection: claims
      one_collection_field: null
      one_deselect_action: nullify
      one_field: null
      sort_field: null
    schema:
      table: claim_tasks
      column: claim
      foreign_key_table: claims
      foreign_key_column: id
      constraint_name: claim_tasks_claim_foreign
      on_update: NO ACTION
      on_delete: CASCADE
  - collection: claim_tasks
    field: assignee
    related_collection: claims_contacts
    meta:
      junction_field: null
      many_collection: claim_tasks
      many_field: assignee
      one_allowed_collections: null
      one_collection: claims_contacts
      one_collection_field: null
      one_deselect_action: nullify
      one_field: null
      sort_field: null
    schema:
      table: claim_tasks
      column: assignee
      foreign_key_table: claims_contacts
      foreign_key_column: id
      constraint_name: claim_tasks_assignee_foreign
      on_update: NO ACTION
      on_delete: SET NULL
  - collection: claims
    field: primary_insured
    related_collection: insureds
    meta:
      junction_field: null
      many_collection: claims
      many_field: primary_insured
      one_allowed_collections: null
      one_collection: insureds
      one_collection_field: null
      one_deselect_action: nullify
      one_field: null
      sort_field: null
    schema:
      table: claims
      column: primary_insured
      foreign_key_table: insureds
      foreign_key_column: id
      constraint_name: claims_primary_insured_foreign
      on_update: NO ACTION
      on_delete: RESTRICT
  - collection: claims
    field: secondary_insured
    related_collection: insureds
    meta:
      junction_field: null
      many_collection: claims
      many_field: secondary_insured
      one_allowed_collections: null
      one_collection: insureds
      one_collection_field: null
      one_deselect_action: nullify
      one_field: null
      sort_field: null
    schema:
      table: claims
      column: secondary_insured
      foreign_key_table: insureds
      foreign_key_column: id
      constraint_name: claims_secondary_insured_foreign
      on_update: NO ACTION
      on_delete: SET NULL
  - collection: claims
    field: loss_location
    related_collection: addresses
    meta:
      junction_field: null
      many_collection: claims
      many_field: loss_location
      one_allowed_collections: null
      one_collection: addresses
      one_collection_field: null
      one_deselect_action: nullify
      one_field: null
      sort_field: null
    schema:
      table: claims
      column: loss_location
      foreign_key_table: addresses
      foreign_key_column: id
      constraint_name: claims_loss_location_foreign
      on_update: NO ACTION
      on_delete: RESTRICT
  - collection: claims
    field: carrier
    related_collection: carriers
    meta:
      junction_field: null
      many_collection: claims
      many_field: carrier
      one_allowed_collections: null
      one_collection: carriers
      one_collection_field: null
      one_deselect_action: nullify
      one_field: null
      sort_field: null
    schema:
      table: claims
      column: carrier
      foreign_key_table: carriers
      foreign_key_column: id
      constraint_name: claims_carrier_foreign
      on_update: NO ACTION
      on_delete: RESTRICT
  - collection: claims
    field: policy
    related_collection: policies
    meta:
      junction_field: null
      many_collection: claims
      many_field: policy
      one_allowed_collections: null
      one_collection: policies
      one_collection_field: null
      one_deselect_action: nullify
      one_field: null
      sort_field: null
    schema:
      table: claims
      column: policy
      foreign_key_table: policies
      foreign_key_column: id
      constraint_name: claims_policy_foreign
      on_update: NO ACTION
      on_delete: SET NULL
  - collection: claims
    field: claim_type
    related_collection: claim_type
    meta:
      junction_field: null
      many_collection: claims
      many_field: claim_type
      one_allowed_collections: null
      one_collection: claim_type
      one_collection_field: null
      one_deselect_action: nullify
      one_field: null
      sort_field: null
    schema:
      table: claims
      column: claim_type
      foreign_key_table: claim_type
      foreign_key_column: id
      constraint_name: claims_claim_type_foreign
      on_update: NO ACTION
      on_delete: RESTRICT
  - collection: claims
    field: loss_cause
    related_collection: loss_cause
    meta:
      junction_field: null
      many_collection: claims
      many_field: loss_cause
      one_allowed_collections: null
      one_collection: loss_cause
      one_collection_field: null
      one_deselect_action: nullify
      one_field: null
      sort_field: null
    schema:
      table: claims
      column: loss_cause
      foreign_key_table: loss_cause
      foreign_key_column: id
      constraint_name: claims_loss_cause_foreign
      on_update: NO ACTION
      on_delete: RESTRICT
  - collection: claims
    field: status
    related_collection: claim_status
    meta:
      junction_field: null
      many_collection: claims
      many_field: status
      one_allowed_collections: null
      one_collection: claim_status
      one_collection_field: null
      one_deselect_action: nullify
      one_field: null
      sort_field: null
    schema:
      table: claims
      column: status
      foreign_key_table: claim_status
      foreign_key_column: id
      constraint_name: claims_status_foreign
      on_update: NO ACTION
      on_delete: RESTRICT
  - collection: claims
    field: mailing_address
    related_collection: addresses
    meta:
      junction_field: null
      many_collection: claims
      many_field: mailing_address
      one_allowed_collections: null
      one_collection: addresses
      one_collection_field: null
      one_deselect_action: nullify
      one_field: null
      sort_field: null
    schema:
      table: claims
      column: mailing_address
      foreign_key_table: addresses
      foreign_key_column: id
      constraint_name: claims_mailing_address_foreign
      on_update: NO ACTION
      on_delete: SET NULL
  - collection: claims
    field: carrier_contact_id
    related_collection: contacts
    meta:
      junction_field: null
      many_collection: claims
      many_field: carrier_contact_id
      one_allowed_collections: null
      one_collection: contacts
      one_collection_field: null
      one_deselect_action: nullify
      one_field: null
      sort_field: null
    schema:
      table: claims
      column: carrier_contact_id
      foreign_key_table: contacts
      foreign_key_column: id
      constraint_name: claims_carrier_contact_id_foreign
      on_update: NO ACTION
      on_delete: SET NULL
  - collection: claims
    field: assigned_to_user
    related_collection: staff
    meta:
      junction_field: null
      many_collection: claims
      many_field: assigned_to_user
      one_allowed_collections: null
      one_collection: staff
      one_collection_field: null
      one_deselect_action: nullify
      one_field: null
      sort_field: null
    schema:
      table: claims
      column: assigned_to_user
      foreign_key_table: staff
      foreign_key_column: id
      constraint_name: claims_assigned_to_user_foreign
      on_update: NO ACTION
      on_delete: SET NULL
  - collection: claims_contacts
    field: claims_id
    related_collection: claims
    meta:
      junction_field: contacts_id
      many_collection: claims_contacts
      many_field: claims_id
      one_allowed_collections: null
      one_collection: claims
      one_collection_field: null
      one_deselect_action: nullify
      one_field: null
      sort_field: null
    schema:
      table: claims_contacts
      column: claims_id
      foreign_key_table: claims
      foreign_key_column: id
      constraint_name: claims_contacts_claims_id_foreign
      on_update: NO ACTION
      on_delete: CASCADE
  - collection: claims_contacts
    field: contacts_id
    related_collection: contacts
    meta:
      junction_field: claims_id
      many_collection: claims_contacts
      many_field: contacts_id
      one_allowed_collections: null
      one_collection: contacts
      one_collection_field: null
      one_deselect_action: nullify
      one_field: null
      sort_field: null
    schema:
      table: claims_contacts
      column: contacts_id
      foreign_key_table: contacts
      foreign_key_column: id
      constraint_name: claims_contacts_contacts_id_foreign
      on_update: NO ACTION
      on_delete: CASCADE
  - collection: contacts
    field: role
    related_collection: roles
    meta:
      junction_field: null
      many_collection: contacts
      many_field: role
      one_allowed_collections: null
      one_collection: roles
      one_collection_field: null
      one_deselect_action: nullify
      one_field: null
      sort_field: null
    schema:
      table: contacts
      column: role
      foreign_key_table: roles
      foreign_key_column: id
      constraint_name: contacts_role_foreign
      on_update: NO ACTION
      on_delete: SET NULL
  - collection: insureds
    field: mailing_address
    related_collection: addresses
    meta:
      junction_field: null
      many_collection: insureds
      many_field: mailing_address
      one_allowed_collections: null
      one_collection: addresses
      one_collection_field: null
      one_deselect_action: nullify
      one_field: null
      sort_field: null
    schema:
      table: insureds
      column: mailing_address
      foreign_key_table: addresses
      foreign_key_column: id
      constraint_name: insureds_mailing_address_foreign
      on_update: NO ACTION
      on_delete: SET NULL
  - collection: policies
    field: named_insured
    related_collection: insureds
    meta:
      junction_field: null
      many_collection: policies
      many_field: named_insured
      one_allowed_collections: null
      one_collection: insureds
      one_collection_field: null
      one_deselect_action: nullify
      one_field: null
      sort_field: null
    schema:
      table: policies
      column: named_insured
      foreign_key_table: insureds
      foreign_key_column: id
      constraint_name: policies_named_insured_foreign
      on_update: NO ACTION
      on_delete: RESTRICT
  - collection: policies
    field: carrier
    related_collection: carriers
    meta:
      junction_field: null
      many_collection: policies
      many_field: carrier
      one_allowed_collections: null
      one_collection: carriers
      one_collection_field: null
      one_deselect_action: nullify
      one_field: null
      sort_field: null
    schema:
      table: policies
      column: carrier
      foreign_key_table: carriers
      foreign_key_column: id
      constraint_name: policies_carrier_foreign
      on_update: NO ACTION
      on_delete: RESTRICT
  - collection: policy_coverage_lines
    field: policy_id
    related_collection: policies
    meta:
      junction_field: null
      many_collection: policy_coverage_lines
      many_field: policy_id
      one_allowed_collections: null
      one_collection: policies
      one_collection_field: null
      one_deselect_action: nullify
      one_field: null
      sort_field: null
    schema:
      table: policy_coverage_lines
      column: policy_id
      foreign_key_table: policies
      foreign_key_column: id
      constraint_name: policy_coverage_lines_policy_id_foreign
      on_update: NO ACTION
      on_delete: SET NULL
  - collection: staff
    field: user_updated
    related_collection: directus_users
    meta:
      junction_field: null
      many_collection: staff
      many_field: user_updated
      one_allowed_collections: null
      one_collection: directus_users
      one_collection_field: null
      one_deselect_action: nullify
      one_field: null
      sort_field: null
    schema:
      table: staff
      column: user_updated
      foreign_key_table: directus_users
      foreign_key_column: id
      constraint_name: staff_user_updated_foreign
      on_update: NO ACTION
      on_delete: NO ACTION
  - collection: staff
    field: user_created
    related_collection: directus_users
    meta:
      junction_field: null
      many_collection: staff
      many_field: user_created
      one_allowed_collections: null
      one_collection: directus_users
      one_collection_field: null
      one_deselect_action: nullify
      one_field: null
      sort_field: null
    schema:
      table: staff
      column: user_created
      foreign_key_table: directus_users
      foreign_key_column: id
      constraint_name: staff_user_created_foreign
      on_update: NO ACTION
      on_delete: NO ACTION
  - collection: staff_role
    field: item
    related_collection: null
    meta:
      junction_field: staff_id
      many_collection: staff_role
      many_field: item
      one_allowed_collections:
        - staff_roles
      one_collection: null
      one_collection_field: collection
      one_deselect_action: nullify
      one_field: null
      sort_field: null
  - collection: staff_role
    field: staff_id
    related_collection: staff
    meta:
      junction_field: item
      many_collection: staff_role
      many_field: staff_id
      one_allowed_collections: null
      one_collection: staff
      one_collection_field: null
      one_deselect_action: nullify
      one_field: null
      sort_field: null
    schema:
      table: staff_role
      column: staff_id
      foreign_key_table: staff
      foreign_key_column: id
      constraint_name: staff_role_staff_id_foreign
      on_update: NO ACTION
      on_delete: SET NULL
  - collection: staff_roles
    field: user_updated
    related_collection: directus_users
    meta:
      junction_field: null
      many_collection: staff_roles
      many_field: user_updated
      one_allowed_collections: null
      one_collection: directus_users
      one_collection_field: null
      one_deselect_action: nullify
      one_field: null
      sort_field: null
    schema:
      table: staff_roles
      column: user_updated
      foreign_key_table: directus_users
      foreign_key_column: id
      constraint_name: staff_roles_user_updated_foreign
      on_update: NO ACTION
      on_delete: NO ACTION
  - collection: staff_roles
    field: user_created
    related_collection: directus_users
    meta:
      junction_field: null
      many_collection: staff_roles
      many_field: user_created
      one_allowed_collections: null
      one_collection: directus_users
      one_collection_field: null
      one_deselect_action: nullify
      one_field: null
      sort_field: null
    schema:
      table: staff_roles
      column: user_created
      foreign_key_table: directus_users
      foreign_key_column: id
      constraint_name: staff_roles_user_created_foreign
      on_update: NO ACTION
      on_delete: NO ACTION
  - collection: staff_roles
    field: staff_id
    related_collection: staff
    meta:
      junction_field: roles_id
      many_collection: staff_roles
      many_field: staff_id
      one_allowed_collections: null
      one_collection: staff
      one_collection_field: null
      one_deselect_action: nullify
      one_field: assigned_roles
      sort_field: null
    schema:
      table: staff_roles
      column: staff_id
      foreign_key_table: staff
      foreign_key_column: id
      constraint_name: staff_roles_staff_id_foreign
      on_update: NO ACTION
      on_delete: SET NULL
  - collection: staff_roles
    field: role_id
    related_collection: roles
    meta:
      junction_field: null
      many_collection: staff_roles
      many_field: role_id
      one_allowed_collections: null
      one_collection: roles
      one_collection_field: null
      one_deselect_action: nullify
      one_field: null
      sort_field: null
    schema:
      table: staff_roles
      column: role_id
      foreign_key_table: roles
      foreign_key_column: id
      constraint_name: staff_roles_role_id_foreign
      on_update: NO ACTION
      on_delete: SET NULL
  - collection: staff_roles
    field: roles_id
    related_collection: roles
    meta:
      junction_field: staff_id
      many_collection: staff_roles
      many_field: roles_id
      one_allowed_collections: null
      one_collection: roles
      one_collection_field: null
      one_deselect_action: nullify
      one_field: null
      sort_field: null
    schema:
      table: staff_roles
      column: roles_id
      foreign_key_table: roles
      foreign_key_column: id
      constraint_name: staff_roles_roles_id_foreign
      on_update: NO ACTION
      on_delete: SET NULL