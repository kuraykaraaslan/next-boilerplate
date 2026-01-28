// ============================================================================
// Module Initialization
// ============================================================================
// Import this file in your app's entry point to initialize the module system.
// Configuration is loaded from each module's module.json file.

// Initialize registries (required for module resolution)
import '@/modules/setting/icons.registry';
import '@/modules/setting/components.registry';
import '@/modules/setting/keys.registry';

// Pre-load all modules (triggers JSON imports)
import '@/modules/registry';
