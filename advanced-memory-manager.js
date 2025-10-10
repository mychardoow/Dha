// Advanced Memory Management System for Render Free Tier
const v8 = require('v8');

class AdvancedMemoryManager {
    constructor() {
        this.maxMemoryUsage = 450 * 1024 * 1024; // 450MB
        this.warningThreshold = 400 * 1024 * 1024; // 400MB
        this.criticalThreshold = 430 * 1024 * 1024; // 430MB
        this.gcInterval = 30000; // 30 seconds
        this.isActive = true;
    }

    async start() {
        console.log('💾 Starting Advanced Memory Management...');
        
        // Start memory monitoring
        this.startMemoryMonitoring();
        
        // Start garbage collection optimization
        this.startGCOptimization();
        
        // Start heap optimization
        this.startHeapOptimization();
    }

    startMemoryMonitoring() {
        setInterval(() => {
            if (!this.isActive) return;
            
            const memoryUsage = process.memoryUsage();
            
            if (memoryUsage.heapUsed > this.criticalThreshold) {
                console.log('⚠️ Critical memory usage detected, forcing optimization...');
                this.forceMemoryOptimization();
            } else if (memoryUsage.heapUsed > this.warningThreshold) {
                console.log('⚠️ High memory usage detected, running optimization...');
                this.optimizeMemory();
            }
        }, 15000);
    }

    startGCOptimization() {
        if (global.gc) {
            setInterval(() => {
                if (!this.isActive) return;
                
                const beforeGC = process.memoryUsage().heapUsed;
                global.gc();
                const afterGC = process.memoryUsage().heapUsed;
                
                console.log(`♻️ GC freed ${Math.round((beforeGC - afterGC) / 1024 / 1024)}MB`);
            }, this.gcInterval);
        }
    }

    startHeapOptimization() {
        setInterval(() => {
            if (!this.isActive) return;
            
            // Optimize V8 heap
            v8.getHeapStatistics();
            
            // Clear module cache for unused modules
            this.clearModuleCache();
            
            // Compact heap if possible
            if (v8.getHeapSpaceStatistics) {
                const heapSpaces = v8.getHeapSpaceStatistics();
                for (const space of heapSpaces) {
                    if (space.space_name === 'new_space' || space.space_name === 'old_space') {
                        if (space.space_available_size < space.space_size * 0.2) {
                            global.gc && global.gc();
                            break;
                        }
                    }
                }
            }
        }, 60000);
    }

    forceMemoryOptimization() {
        // Force garbage collection
        if (global.gc) {
            global.gc();
            global.gc();
        }

        // Clear all possible caches
        this.clearModuleCache();
        
        // Reset V8 heap if possible
        if (v8.getHeapSpaceStatistics) {
            const heapSpaces = v8.getHeapSpaceStatistics();
            if (heapSpaces.some(space => space.space_available_size < space.space_size * 0.1)) {
                process.emit('SIGTERM');
            }
        }
    }

    optimizeMemory() {
        // Regular garbage collection
        if (global.gc) {
            global.gc();
        }

        // Clear require cache for non-essential modules
        this.clearModuleCache();
    }

    clearModuleCache() {
        const essentialModules = ['http', 'https', 'express', 'fs', 'path'];
        Object.keys(require.cache).forEach((key) => {
            if (!essentialModules.some(mod => key.includes(mod)) && key.includes('node_modules')) {
                delete require.cache[key];
            }
        });
    }

    stop() {
        this.isActive = false;
        console.log('⏸️ Memory Management System paused');
    }

    resume() {
        this.isActive = true;
        console.log('▶️ Memory Management System resumed');
    }
}

// Start the memory management system
const memoryManager = new AdvancedMemoryManager();
memoryManager.start().catch(console.error);

// Handle process termination
process.on('SIGTERM', () => memoryManager.stop());
process.on('SIGINT', () => memoryManager.stop());