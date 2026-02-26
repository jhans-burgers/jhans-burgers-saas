
import { collection, getDocs, doc, writeBatch, Firestore } from "firebase/firestore";

/**
 * Moves documents from global root collections to a specific tenant's subcollections.
 * NOTE: This is a heavy operation. In a real production app with thousands of docs,
 * this should be a Node.js script using firebase-admin-sdk, not a client-side function.
 * 
 * LIMITATION: Firebase Client SDK batches are limited to 500 operations.
 * This helper chunks operations to stay within limits.
 */
export const migrateGlobalDataToTenant = async (db: Firestore, targetTenantId: string) => {
    if (!targetTenantId) throw new Error("Target Tenant ID required");

    const collectionsToMigrate = [
        'products',
        'orders',
        'clients',
        'drivers',
        'expenses',
        'inventory',
        'suppliers',
        'shoppingList', // Adjust casing if your collection is shopping_list
        'daily_stats',
        'giveaway_entries',
        'giveaway_winners',
        'settlements',
        'vales'
    ];

    const stats: Record<string, number> = {};

    for (const colName of collectionsToMigrate) {
        console.log(`Starting migration for collection: ${colName}...`);
        
        try {
            const sourceColRef = collection(db, colName);
            const snapshot = await getDocs(sourceColRef);
            
            if (snapshot.empty) {
                console.log(`Collection ${colName} is empty. Skipping.`);
                stats[colName] = 0;
                continue;
            }

            // Batch writes (limit 450 per batch to be safe)
            let batch = writeBatch(db);
            let count = 0;
            let total = 0;
            let batchCount = 0;

            for (const docSnap of snapshot.docs) {
                const data = docSnap.data();
                
                // Construct target path: tenants/{tenantId}/{colName}/{docId}
                const targetRef = doc(db, `tenants/${targetTenantId}/${colName}/${docSnap.id}`);
                
                // Add to batch
                batch.set(targetRef, data);
                count++;
                total++;

                // Commit if limit reached
                if (count >= 450) {
                    await batch.commit();
                    console.log(`... committed batch ${++batchCount} for ${colName}`);
                    batch = writeBatch(db); // New batch
                    count = 0;
                }
            }

            // Commit remaining
            if (count > 0) {
                await batch.commit();
                console.log(`... committed final batch for ${colName}`);
            }
            
            stats[colName] = total;
        } catch (err) {
            console.error(`Error migrating ${colName}:`, err);
            stats[colName] = -1; // Error indicator
        }
    }

    // Migrate Config (Special Case)
    console.log("Migrating Config...");
    try {
        const configSnap = await getDocs(collection(db, 'config'));
        if (!configSnap.empty) {
            // Assuming 'main' doc or taking the first one found
            const configData = configSnap.docs[0].data(); 
            const tenantRef = doc(db, 'tenants', targetTenantId);
            
            // Merge config into tenant document
            const batch = writeBatch(db);
            batch.update(tenantRef, {
                // Explicitly map common fields if needed, or spread everything
                appName: configData.appName || '',
                appLogoUrl: configData.appLogoUrl || '',
                bannerUrl: configData.bannerUrl || '',
                theme: configData.theme || '',
                storePhone: configData.storePhone || '',
                // Save the full legacy config object just in case
                config: configData
            });
            await batch.commit();
            console.log("Config migrated successfully.");
            stats['config'] = 1;
        } else {
            console.log("No global config found.");
            stats['config'] = 0;
        }
    } catch (e) {
        console.error("Error migrating config:", e);
        stats['config'] = -1;
    }

    return stats;
};
