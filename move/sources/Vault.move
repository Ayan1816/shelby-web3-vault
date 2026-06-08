module shelby_vault::vault {
    use std::string::String;
    use aptos_framework::account;
    use aptos_framework::event;
    use aptos_framework::timestamp;

    // এই স্ট্রাকচারটি হলো আমাদের ডেটাবেস
    struct VaultRecord has key {
        data: String,
        timestamp: u64,
    }

    // যখন কেউ নতুন ডেটা সেভ করবে, তখন এই ইভেন্টটি ফায়ার হবে
    #[event]
    struct RecordStored has drop, store {
        owner: address,
        timestamp: u64,
    }

    // এই ফাংশনটি দিয়ে ইউজাররা তাদের ডেটা সেভ করবে
    public entry fun store_data(account: &signer, encrypted_data: String) {
        let owner_addr = address_of(account);
        let current_time = timestamp::now_seconds();

        // যদি আগে থেকে কোনো ডেটা থাকে, তবে সেটি মুছে নতুনটা বসাবে
        if (exists<VaultRecord>(owner_addr)) {
            let record = borrow_global_mut<VaultRecord>(owner_addr);
            record.data = encrypted_data;
            record.timestamp = current_time;
        } else {
            // যদি নতুন হয়, তবে নতুন করে সেভ করবে
            move_to(account, VaultRecord {
                data: encrypted_data,
                timestamp: current_time,
            });
        };

        // ইভেন্ট ফায়ার করা
        event::emit(RecordStored {
            owner: owner_addr,
            timestamp: current_time,
        });
    }
}

