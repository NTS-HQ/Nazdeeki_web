// Blockchain Counter and Transparent Transaction Visualization

class BlockchainCounter {
    constructor() {
        this.currentCount = 0;
        this.targetCount = 0;
        this.isAnimating = false;
        this.transactionHash = '';
        this.blockHeight = 847291;
        
        this.initializeCounter();
        this.initializeBlockchainElements();
        this.startBlockchainSimulation();
        this.bindEvents();
    }

    // Initialize the counter display
    initializeCounter() {
        this.counterElement = document.getElementById('userCount');
        this.hashElement = document.getElementById('txHash');
        this.blockElement = document.getElementById('blockNumber');
        this.progressElement = document.getElementById('verificationProgress');
        
        // Get initial count from server
        this.fetchCurrentCount();
    }

    // Initialize blockchain visual elements
    initializeBlockchainElements() {
        // Generate initial transaction hash
        this.generateTransactionHash();
        
        // Update block height periodically
        this.updateBlockHeight();
        
        // Start verification animation
        this.startVerificationAnimation();
    }

    // Fetch current count from server
    async fetchCurrentCount() {
        try {
            const response = await fetch('/api/count');
            const data = await response.json();
            this.currentCount = data.count || 0;
            this.targetCount = this.currentCount;
            this.updateCounterDisplay();
        } catch (error) {
            console.error('Error fetching count:', error);
            // Fallback to demo count
            this.currentCount = 1247;
            this.targetCount = this.currentCount;
            this.updateCounterDisplay();
        }
    }

    // Update counter display with animation
    updateCounterDisplay() {
        if (this.counterElement) {
            // Use CSS counter animation for smooth counting
            this.animateCounter(this.currentCount, this.targetCount);
        }
    }

    // Animate counter using CSS properties
    animateCounter(from, to) {
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        const duration = 2000; // 2 seconds
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-out-cubic)
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            const currentValue = Math.floor(from + (to - from) * easeProgress);
            
            // Update CSS custom property for counter animation
            if (this.counterElement) {
                this.counterElement.style.setProperty('--counter', currentValue);
                this.counterElement.textContent = currentValue.toLocaleString();
            }
            
            // Continue animation
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.isAnimating = false;
                this.currentCount = to;
                
                // Trigger celebration animation
                this.triggerCelebrationEffect();
            }
        };
        
        requestAnimationFrame(animate);
    }

    // Generate realistic transaction hash
    generateTransactionHash() {
        const chars = '0123456789abcdef';
        let hash = '0x';
        
        for (let i = 0; i < 64; i++) {
            hash += chars[Math.floor(Math.random() * chars.length)];
        }
        
        this.transactionHash = hash;
        
        if (this.hashElement) {
            this.hashElement.textContent = hash;
            this.animateHashUpdate();
        }
        
        return hash;
    }

    // Animate hash update
    animateHashUpdate() {
        if (!this.hashElement) return;
        
        // Add flickering effect
        this.hashElement.style.animation = 'none';
        setTimeout(() => {
            this.hashElement.style.animation = 'hashFlicker 4s ease-in-out infinite';
        }, 10);
    }

    // Update block height simulation
    updateBlockHeight() {
        const updateBlock = () => {
            // Simulate new blocks every 12-15 seconds (like Ethereum)
            const blockTime = Math.random() * 3000 + 12000; // 12-15 seconds
            
            setTimeout(() => {
                this.blockHeight += 1;
                
                if (this.blockElement) {
                    this.blockElement.textContent = this.blockHeight.toLocaleString();
                    this.animateBlockUpdate();
                }
                
                updateBlock(); // Continue the cycle
            }, blockTime);
        };
        
        updateBlock();
    }

    // Animate block update
    animateBlockUpdate() {
        if (!this.blockElement) return;
        
        // Flash effect for new block
        this.blockElement.style.color = '#00ff88';
        this.blockElement.style.textShadow = '0 0 10px #00ff88';
        
        setTimeout(() => {
            this.blockElement.style.color = '#ffffff';
            this.blockElement.style.textShadow = 'none';
        }, 1000);
    }

    // Start verification animation
    startVerificationAnimation() {
        if (!this.progressElement) return;
        
        const animateProgress = () => {
            // Reset progress
            this.progressElement.style.width = '0%';
            
            // Animate to completion
            setTimeout(() => {
                this.progressElement.style.width = '100%';
            }, 100);
            
            // Reset and repeat
            setTimeout(() => {
                animateProgress();
            }, 4000); // Every 4 seconds
        };
        
        animateProgress();
    }

    // Bind form events
    bindEvents() {
        const form = document.getElementById('waitlistForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }
    }

    // Handle form submission with blockchain visualization
    async handleFormSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const email = formData.get('email');
        
        if (!email) return;
        
        // Start transaction animation
        this.startTransactionAnimation();
        
        try {
            const response = await fetch('/api/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    email: email,
                    method: 'web3_interface'
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Update counter with new count
                this.targetCount = data.count;
                this.animateCounter(this.currentCount, this.targetCount);
                
                // Generate new transaction hash
                this.generateTransactionHash();
                
                // Show success message
                this.showTransactionSuccess();
                
                // Reset form
                e.target.reset();
                
            } else {
                this.showTransactionError(data.error);
            }
            
        } catch (error) {
            console.error('Submission error:', error);
            this.showTransactionError('Network error occurred');
        }
    }

    // Start transaction animation
    startTransactionAnimation() {
        const button = document.querySelector('.web3-button');
        if (button) {
            button.style.opacity = '0.7';
            button.style.pointerEvents = 'none';
            
            const buttonText = button.querySelector('.button-text');
            if (buttonText) {
                buttonText.textContent = 'Broadcasting...';
            }
        }
        
        // Show progress animation
        if (this.progressElement) {
            this.progressElement.style.background = 'linear-gradient(90deg, #ff006e, #ffbe0b, #8338ec, #3a86ff)';
            this.progressElement.style.animation = 'progressPulse 1s ease-in-out infinite';
        }
        
        // Update progress text
        const progressText = document.querySelector('.progress-text');
        if (progressText) {
            progressText.textContent = 'Broadcasting transaction...';
        }
    }

    // Show transaction success
    showTransactionSuccess() {
        const button = document.querySelector('.web3-button');
        if (button) {
            button.style.opacity = '1';
            button.style.pointerEvents = 'auto';
            
            const buttonText = button.querySelector('.button-text');
            if (buttonText) {
                buttonText.textContent = 'Transaction Confirmed!';
                
                setTimeout(() => {
                    buttonText.textContent = 'Join Network';
                }, 3000);
            }
        }
        
        // Reset progress animation
        if (this.progressElement) {
            this.progressElement.style.background = 'var(--web3-gradient)';
            this.progressElement.style.animation = 'none';
        }
        
        // Update progress text
        const progressText = document.querySelector('.progress-text');
        if (progressText) {
            progressText.textContent = 'Transaction confirmed on blockchain';
            
            setTimeout(() => {
                progressText.textContent = 'Verifying on blockchain...';
            }, 3000);
        }
        
        // Create success particles
        this.createSuccessParticles();
    }

    // Show transaction error
    showTransactionError(message) {
        const button = document.querySelector('.web3-button');
        if (button) {
            button.style.opacity = '1';
            button.style.pointerEvents = 'auto';
            
            const buttonText = button.querySelector('.button-text');
            if (buttonText) {
                buttonText.textContent = 'Transaction Failed';
                buttonText.style.color = '#ff4444';
                
                setTimeout(() => {
                    buttonText.textContent = 'Join Network';
                    buttonText.style.color = '#ffffff';
                }, 3000);
            }
        }
        
        // Show error in progress text
        const progressText = document.querySelector('.progress-text');
        if (progressText) {
            progressText.textContent = `Error: ${message}`;
            progressText.style.color = '#ff4444';
            
            setTimeout(() => {
                progressText.textContent = 'Verifying on blockchain...';
                progressText.style.color = 'rgba(255, 255, 255, 0.6)';
            }, 3000);
        }
    }

    // Create success particle effect
    createSuccessParticles() {
        const counterCard = document.querySelector('.counter-card');
        if (!counterCard) return;
        
        // Create multiple particles
        for (let i = 0; i < 10; i++) {
            const particle = document.createElement('div');
            particle.style.position = 'absolute';
            particle.style.width = '6px';
            particle.style.height = '6px';
            particle.style.background = '#00ff88';
            particle.style.borderRadius = '50%';
            particle.style.pointerEvents = 'none';
            particle.style.zIndex = '1000';
            
            // Random position around counter
            const rect = counterCard.getBoundingClientRect();
            particle.style.left = `${rect.left + rect.width / 2 + (Math.random() - 0.5) * 100}px`;
            particle.style.top = `${rect.top + rect.height / 2 + (Math.random() - 0.5) * 100}px`;
            
            document.body.appendChild(particle);
            
            // Animate particle
            particle.animate([
                { 
                    transform: 'scale(0) translateY(0px)', 
                    opacity: 1 
                },
                { 
                    transform: 'scale(1) translateY(-50px)', 
                    opacity: 1,
                    offset: 0.5
                },
                { 
                    transform: 'scale(0) translateY(-100px)', 
                    opacity: 0 
                }
            ], {
                duration: 2000,
                easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            }).onfinish = () => {
                particle.remove();
            };
        }
    }

    // Trigger celebration effect
    triggerCelebrationEffect() {
        const counterNumber = document.querySelector('.counter-number');
        if (!counterNumber) return;
        
        // Scale animation
        counterNumber.animate([
            { transform: 'scale(1)' },
            { transform: 'scale(1.2)' },
            { transform: 'scale(1)' }
        ], {
            duration: 600,
            easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
        });
        
        // Glow effect
        counterNumber.style.textShadow = '0 0 20px #667eea, 0 0 40px #764ba2';
        setTimeout(() => {
            counterNumber.style.textShadow = 'none';
        }, 1000);
    }

    // Start blockchain simulation for demo purposes
    startBlockchainSimulation() {
        // Simulate network activity
        const simulateNetworkActivity = () => {
            const networkStatus = document.querySelector('.network-status');
            const statusDot = document.querySelector('.status-dot');
            
            if (networkStatus && statusDot) {
                // Random network activity
                const activities = [
                    'Processing transactions...',
                    'Network Active',
                    'Validating blocks...',
                    'Syncing with peers...'
                ];
                
                const randomActivity = activities[Math.floor(Math.random() * activities.length)];
                const statusText = networkStatus.querySelector('span');
                
                if (statusText && Math.random() > 0.7) { // 30% chance to show activity
                    const originalText = statusText.textContent;
                    statusText.textContent = randomActivity;
                    statusDot.style.background = '#ffbe0b';
                    
                    setTimeout(() => {
                        statusText.textContent = originalText;
                        statusDot.style.background = '#00ff88';
                    }, 2000);
                }
            }
        };
        
        // Run simulation every 5-10 seconds
        const runSimulation = () => {
            simulateNetworkActivity();
            setTimeout(runSimulation, Math.random() * 5000 + 5000);
        };
        
        runSimulation();
    }

    // Simulate real-time counter updates (for demo purposes)
    startRealtimeUpdates() {
        setInterval(() => {
            // Small chance of getting a new signup
            if (Math.random() > 0.95) { // 5% chance every interval
                this.targetCount += 1;
                this.animateCounter(this.currentCount, this.targetCount);
                this.generateTransactionHash();
            }
        }, 10000); // Check every 10 seconds
    }

    // Initialize Google Analytics tracking for Web3 events
    trackWeb3Event(eventName, parameters = {}) {
        if (typeof gtag !== 'undefined') {
            gtag('event', eventName, {
                event_category: 'Web3_Interaction',
                event_label: 'Blockchain_Counter',
                ...parameters
            });
        }
    }

    // Performance monitoring for animations
    monitorPerformance() {
        let animationFrameId;
        let lastTime = performance.now();
        let frameCount = 0;
        
        const measureFPS = (currentTime) => {
            frameCount++;
            
            if (currentTime >= lastTime + 1000) {
                const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
                
                // Log performance warning if FPS drops below 30
                if (fps < 30) {
                    console.warn(`Low FPS detected: ${fps}fps. Consider reducing animation complexity.`);
                }
                
                frameCount = 0;
                lastTime = currentTime;
            }
            
            animationFrameId = requestAnimationFrame(measureFPS);
        };
        
        measureFPS(performance.now());
        
        // Stop monitoring after 30 seconds
        setTimeout(() => {
            cancelAnimationFrame(animationFrameId);
        }, 30000);
    }
}

// Initialize blockchain counter when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const blockchainCounter = new BlockchainCounter();
    
    // Start real-time updates for demo
    blockchainCounter.startRealtimeUpdates();
    
    // Monitor performance in development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        blockchainCounter.monitorPerformance();
    }
});

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BlockchainCounter;
}