module shelby::vault {
    use std::string::String;
    use aptos_framework::timestamp;
    use std::vector;
    use std::signer;

    /// Error Codes
    const E_VAULT_NOT_INITIALIZED: u64 = 1;

    // Struct to hold individual encrypted records
    struct VaultRecord has store, drop, copy {
        data_hash: String,
        encrypted_payload: String,
        asset_type: String,
        timestamp: u64,
    }

    // Struct to hold the user's entire vault
    struct UserVault has key {
        records: vector<VaultRecord>,
    }

    /// Initialize a secure vault for the user
    public entry fun init_vault(account: &signer) {
        let addr = signer::address_of(account);
        if (!exists<UserVault>(addr)) {
            move_to(account, UserVault {
                records: vector::empty<VaultRecord>(),
            });
        }
    }

    /// Store newly encrypted AES-256 data directly on the Aptos Ledger
    public entry fun store_secure_data(
        account: &signer,
        data_hash: String,
        encrypted_payload: String,
        asset_type: String
    ) acquires UserVault {
        let addr = signer::address_of(account);
        
        // Auto-initialize vault if not exists
        if (!exists<UserVault>(addr)) {
            init_vault(account);
        };

        let vault = borrow_global_mut<UserVault>(addr);
        let current_time = timestamp::now_seconds();

        let new_record = VaultRecord {
            data_hash,
            encrypted_payload,
            asset_type,
            timestamp: current_time,
        };

        vector::push_back(&mut vault.records, new_record);
    }
}
