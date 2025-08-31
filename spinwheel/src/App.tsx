import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface NameEntry {
  id: string;
  name: string;
  sectionIndex: number;
  isPreSelectedWinner: boolean;
}

interface RemovedNameEntry {
  id: string;
  name: string;
  removedAt: Date;
  wasWinner: boolean;
}

const SpinWheel: React.FC = () => {
  // State management
  const [names, setNames] = useState<NameEntry[]>([]);
  const [removedNames, setRemovedNames] = useState<RemovedNameEntry[]>([]);
  const [newName, setNewName] = useState('');
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showRemovedNames, setShowRemovedNames] = useState(false);
  const [currentRotation, setCurrentRotation] = useState(0);
  const [gamePhase, setGamePhase] = useState<'playing' | 'final-winner'>('playing');
  const [preSelectedWinner, setPreSelectedWinner] = useState<string>('');
  
  // Refs
  const wheelRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  
  // Audio context for generating sounds
  const audioContextRef = useRef<AudioContext | null>(null);

  // Extended colors for individual slices
  const sectionColors = [
    '#10B981', // Green
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#3B82F6', // Blue
    '#8B5CF6', // Violet
    '#F97316', // Orange
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#84CC16', // Lime
    '#F43F5E', // Rose
    '#8B5CF6', // Purple
    '#F59E0B', // Yellow
  ];

  // Initialize audio context on user interaction
  const initializeAudio = useCallback(() => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        console.log('🔊 Audio context initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize audio context:', error);
      }
    }
    
    // Resume audio context if it's suspended
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().then(() => {
        console.log('🔊 Audio context resumed');
      }).catch(error => {
        console.error('❌ Failed to resume audio context:', error);
      });
    }
  }, []);

  // Realistic tick/click sound system for authentic wheel experience
  const tickSoundRef = useRef<HTMLAudioElement | null>(null);
  const tickIntervalRef = useRef<number | null>(null);
  const isTickingRef = useRef(false);
  
  // Initialize tick sound
  const initializeTickSound = useCallback(() => {
    if (!tickSoundRef.current) {
      try {
        // Create audio element for tick sound
        tickSoundRef.current = new Audio();
        tickSoundRef.current.src = '/assets/sounds/tick.mp3'; // Default tick sound
        tickSoundRef.current.preload = 'auto';
        tickSoundRef.current.volume = 0.6;
        
        // Fallback: Generate synthetic tick sound if file not found
        tickSoundRef.current.onerror = () => {
          console.log('⚠️ Tick sound file not found, using synthetic tick');
          generateSyntheticTickSound();
        };
        
        console.log('🔊 Tick sound initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize tick sound:', error);
        generateSyntheticTickSound();
      }
    }
  }, []);
  
  // Generate synthetic tick sound as fallback
  const generateSyntheticTickSound = useCallback(() => {
    if (!audioContextRef.current) return;
    
    const audioContext = audioContextRef.current;
    const currentTime = audioContext.currentTime;
    
    // Create realistic tick sound using oscillators
    const tickOsc = audioContext.createOscillator();
    const tickGain = audioContext.createGain();
    const noiseOsc = audioContext.createOscillator();
    const noiseGain = audioContext.createGain();
    
    // Main tick frequency with slight variation
    tickOsc.type = 'sine';
    tickOsc.frequency.setValueAtTime(800 + Math.random() * 100, currentTime);
    tickGain.gain.setValueAtTime(0.3, currentTime);
    tickGain.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.05);
    
    // Noise layer for mechanical feel
    noiseOsc.type = 'square';
    noiseOsc.frequency.setValueAtTime(2000 + Math.random() * 500, currentTime);
    noiseGain.gain.setValueAtTime(0.1, currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.03);
    
    tickOsc.connect(tickGain);
    noiseOsc.connect(noiseGain);
    tickGain.connect(audioContext.destination);
    noiseGain.connect(audioContext.destination);
    
    tickOsc.start(currentTime);
    noiseOsc.start(currentTime);
    tickOsc.stop(currentTime + 0.05);
    noiseOsc.stop(currentTime + 0.03);
  }, []);
  
  // Start ticking sound with speed-based timing
  const startTickSound = useCallback((initialSpeed: number) => {
    if (isTickingRef.current) return;
    
    initializeTickSound();
    isTickingRef.current = true;
    
    let currentSpeed = initialSpeed;
    let tickCount = 0;
    const maxTicks = 100; // Prevent infinite ticking
    
    const tick = () => {
      if (!isTickingRef.current || tickCount >= maxTicks) {
        stopTickSound();
        return;
      }
      
      // Play tick sound
      if (tickSoundRef.current && tickSoundRef.current.readyState >= 2) {
        tickSoundRef.current.currentTime = 0;
        tickSoundRef.current.play().catch(() => {
          // Fallback to synthetic sound if audio file fails
          generateSyntheticTickSound();
        });
      } else {
        generateSyntheticTickSound();
      }
      
      tickCount++;
      
      // Calculate next tick timing based on current speed
      const tickInterval = Math.max(50, 1000 / currentSpeed); // Min 50ms between ticks
      
      // Gradually slow down ticking
      currentSpeed *= 0.98; // Slow down by 2% each tick
      
      // Schedule next tick
      tickIntervalRef.current = setTimeout(tick, tickInterval);
    };
    
    // Start first tick immediately
    tick();
  }, [initializeTickSound, generateSyntheticTickSound]);
  
  // Stop ticking sound
  const stopTickSound = useCallback(() => {
    isTickingRef.current = false;
    if (tickIntervalRef.current) {
      clearTimeout(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }
    console.log('🔇 Tick sound stopped');
  }, []);
  
  // Cleanup tick sound on unmount
  useEffect(() => {
    return () => {
      stopTickSound();
    };
  }, [stopTickSound]);

  // Generate section selection blink sound - Original well-synced version
  const generateBlinkSound = useCallback(() => {
    try {
      // Initialize audio if needed
      initializeAudio();
      
      if (!audioContextRef.current) {
        console.warn('⚠️ Audio context not available');
        return;
      }
      
      const audioContext = audioContextRef.current;
      
      // Check if audio context is running
      if (audioContext.state !== 'running') {
        console.warn('⚠️ Audio context not running, attempting to resume...');
        audioContext.resume().then(() => {
          console.log('🔊 Audio context resumed, playing blink sound...');
          generateBlinkSound(); // Retry after resume
        }).catch(error => {
          console.error('❌ Failed to resume audio context:', error);
        });
        return;
      }
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Original well-synced blink sound
      oscillator.frequency.setValueAtTime(1200, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.15);
      
      gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
      
      console.log('🔊 Original blink sound played successfully');
    } catch (error) {
      console.error('❌ Error playing blink sound:', error);
    }
  }, [initializeAudio]);

  // Security: Disable right-click and inspect element
  useEffect(() => {
    const preventDefault = (e: Event) => e.preventDefault();
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && ['I', 'C', 'J'].includes(e.key)) e.preventDefault();
      if (e.ctrlKey && e.key === 'U') e.preventDefault();
      if (e.key === 'F12') e.preventDefault();
    };

    // Initialize audio on first user interaction
    const handleUserInteraction = () => {
      initializeAudio();
      // Remove listeners after first interaction
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };

    document.addEventListener('contextmenu', preventDefault);
    document.addEventListener('keydown', handleKeyDown);
    
    // Add user interaction listeners for audio initialization
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);

    return () => {
      document.removeEventListener('contextmenu', preventDefault);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, [initializeAudio]);

  // Optimized function to handle large participant lists efficiently
  const getOptimizedSectionCount = useCallback((nameCount: number) => {
    // For very large lists, optimize section count to maintain performance
    if (nameCount <= 6) {
      return nameCount; // Each name gets its own section
    } else if (nameCount <= 50) {
      return Math.min(nameCount, 6); // Max 6 sections for medium lists
    } else if (nameCount <= 500) {
      return Math.min(Math.ceil(nameCount / 10), 12); // 10-12 sections for large lists
    } else {
      // For very large lists (up to 5000), use logarithmic scaling
      return Math.min(Math.ceil(Math.log(nameCount) * 3), 20);
    }
  }, []);

  // Get names by section with dynamic section count
  const getNamesBySection = useCallback((nameList: NameEntry[]) => {
    const sectionCount = getOptimizedSectionCount(nameList.length);
    
    if (nameList.length <= 6) {
      // When 6 or fewer names: each name gets its own section
      const sections: NameEntry[][] = Array.from({ length: sectionCount }, () => []);
      nameList.forEach((name, index) => {
        sections[index].push(name);
      });
      return sections;
    } else {
      // Normal distribution: use optimized section count
      const sections: NameEntry[][] = Array.from({ length: sectionCount }, () => []);
      nameList.forEach(name => {
        if (name.sectionIndex < sectionCount) {
          sections[name.sectionIndex].push(name);
        }
      });
      return sections;
    }
  }, [getOptimizedSectionCount]);

  // Distribute names evenly across dynamic sections
  const distributeNamesEvenly = useCallback((nameList: NameEntry[]) => {
    // CRITICAL: Always preserve winner flags during distribution
    const shuffled = [...nameList].sort(() => Math.random() - 0.5);
    const sectionCount = getOptimizedSectionCount(nameList.length);
    
    const distributed = shuffled.map((name, index) => ({
      ...name,
      sectionIndex: index % sectionCount
    }));
    
    // Verify winner flags are preserved
    const originalWinners = nameList.filter(name => name.isPreSelectedWinner);
    const distributedWinners = distributed.filter(name => name.isPreSelectedWinner);
    
    if (originalWinners.length !== distributedWinners.length) {
      console.error('❌ Winner flags were lost during distribution!');
      // Restore winner flags if they were lost
      return nameList.map(name => ({
        ...name,
        sectionIndex: name.sectionIndex
      }));
    }
    
    return distributed;
  }, [getOptimizedSectionCount]);

  // Set pre-selected winner (case-insensitive, trimmed)
  const setPreSelectedWinnerHandler = useCallback((winnerName: string) => {
    setNames(prev => prev.map(name => ({
      ...name,
      isPreSelectedWinner: name.name.toLowerCase().trim() === winnerName.toLowerCase().trim()
    })));
    setPreSelectedWinner(winnerName);
    console.log('🎯 Pre-selected winner set:', winnerName);
  }, []);

  // Auto-set "Alex Dhanaraj" as winner if exists in the list (case-insensitive, trimmed, spaces ignored)
  const autoSetAlexDhanarajWinner = useCallback(() => {
    console.log('🔍 Checking for "Alex Dhanaraj" in names:', names.map(n => n.name));
    
    // Helper function to normalize names (remove spaces, lowercase, trim)
    const normalizeName = (name: string) => name.toLowerCase().trim().replace(/\s+/g, '');
    
    // Target name to find (normalized)
    const targetName = 'alexdhanaraj';
    
    const alexDhanarajName = names.find(name => 
      normalizeName(name.name) === targetName
    );
    
    if (alexDhanarajName) {
      console.log('🎯 Found "Alex Dhanaraj"! Setting as pre-selected winner:', alexDhanarajName.name);
      setPreSelectedWinnerHandler(alexDhanarajName.name);
      return true;
    } else {
      console.log('❌ "Alex Dhanaraj" not found in current names list');
    }
    return false;
  }, [names, setPreSelectedWinnerHandler]);

  // Validate that pre-selected winner exists and is properly flagged (case-insensitive, trimmed, spaces ignored)
  const validatePreSelectedWinner = useCallback(() => {
    if (!preSelectedWinner) return false;
    
    // Helper function to normalize names (remove spaces, lowercase, trim)
    const normalizeName = (name: string) => name.toLowerCase().trim().replace(/\s+/g, '');
    
    const winnerInNames = names.find(name => 
      normalizeName(name.name) === normalizeName(preSelectedWinner)
    );
    if (!winnerInNames) {
      console.error(`❌ Pre-selected winner "${preSelectedWinner}" not found in names list!`);
      return false;
    }
    
    if (!winnerInNames.isPreSelectedWinner) {
      console.error(`❌ Pre-selected winner "${preSelectedWinner}" is not properly flagged!`);
      return false;
    }
    
    return true;
  }, [preSelectedWinner, names]);

  // Security: Prevent manual manipulation of winner flags
  const secureWinnerValidation = useCallback(() => {
    // Check if someone tried to manually modify the winner flag
    const allWinners = names.filter(name => name.isPreSelectedWinner);
    
    if (allWinners.length > 1) {
      console.error('❌ Multiple winners detected! Attempting to restore single winner.');
      // Keep only the first winner and remove others
      const firstWinner = allWinners[0];
      setNames(prev => prev.map(name => ({
        ...name,
        isPreSelectedWinner: name.id === firstWinner.id
      })));
      return false;
    }
    
    if (allWinners.length === 0 && preSelectedWinner) {
      console.error('❌ Winner flag was removed! Attempting to restore.');
      // Restore the winner flag (case-insensitive, trimmed, spaces ignored)
      const normalizeName = (name: string) => name.toLowerCase().trim().replace(/\s+/g, '');
      setNames(prev => prev.map(name => ({
        ...name,
        isPreSelectedWinner: normalizeName(name.name) === normalizeName(preSelectedWinner)
      })));
      return false;
    }
    
    return true;
  }, [names, preSelectedWinner]);

  // Continuous monitoring of winner flag integrity and auto-set "Alex Dhanaraj" if found
  useEffect(() => {
    // First, check if we need to auto-set "Alex Dhanaraj" as winner
    if (!preSelectedWinner && names.length > 0) {
      console.log('🔍 No pre-selected winner set. Checking for "Alex Dhanaraj"...');
      autoSetAlexDhanarajWinner();
    }
    
    // Then monitor winner flag integrity
    if (preSelectedWinner && names.length > 0) {
      const normalizeName = (name: string) => name.toLowerCase().trim().replace(/\s+/g, '');
      const winnerInNames = names.find(name => 
        normalizeName(name.name) === normalizeName(preSelectedWinner)
      );
      if (!winnerInNames || !winnerInNames.isPreSelectedWinner) {
        console.warn('⚠️ Winner flag integrity compromised. Attempting to restore...');
        secureWinnerValidation();
      }
    }
  }, [names, preSelectedWinner, secureWinnerValidation, autoSetAlexDhanarajWinner]);

  // Cleanup animation when component unmounts or when isSpinning changes
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isSpinning]);






  // Expose utility functions to window for debugging
  useEffect(() => {
    (window as any).getCurrentWinner = () => preSelectedWinner;
    (window as any).getAllNames = () => names.map(n => n.name);
    (window as any).forceFinalWinner = () => {
      if (preSelectedWinner) {
        setWinner(preSelectedWinner);
        setShowModal(true);
        setGamePhase('final-winner');
      }
    };

       
    // Bulk operations for spreadsheet data
    (window as any).bulkImportNames = (nameList: string[]) => {
      const filteredNames = nameList.filter(name => name && name.trim().length > 0);
      if (filteredNames.length > 0) {
        const newEntries: NameEntry[] = filteredNames.map((name, index) => ({
          id: `${Date.now()}-${index}`,
          name: name.trim(),
          sectionIndex: 0,
          isPreSelectedWinner: false
        }));
        
        setNames(prev => {
          const updated = [...prev, ...newEntries];
          const distributed = distributeNamesEvenly(updated);
          
          // Auto-check for AlexDhanaraj after names are distributed
          setTimeout(() => {
            autoSetAlexDhanarajWinner();
          }, 200);
          
          return distributed;
        });
        

        return filteredNames.length;
      }
      return 0;
    };
    
    (window as any).clearAllNames = () => {
      setNames([]);

    };
    
    (window as any).exportNames = () => {
      const nameList = names.map(n => n.name).join('\n');
      const blob = new Blob([nameList], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'wheel-names.txt';
      a.click();
      URL.revokeObjectURL(url);

    };

    (window as any).clearRemovedNames = () => {
      setRemovedNames([]);

    };

    (window as any).getRemovedNames = () => {
      return removedNames;
    };

    // Test function for the refactored spin wheel logic
    (window as any).testSpinWheelLogic = () => {
      console.log('🧪 Testing Spin Wheel Logic...');
      console.log('📊 Current State:', {
        names: names.map(n => ({ name: n.name, isWinner: n.isPreSelectedWinner })),
        preSelectedWinner,
        gamePhase,
        totalNames: names.length,
        nonWinnerCount: names.filter(n => !n.isPreSelectedWinner).length
      });
      
      // Test section calculation
      const sections = getNamesBySection(names);
      console.log('🎯 Sections:', sections.map((section, i) => ({
        sectionIndex: i,
        names: section.map(n => n.name),
        hasWinner: section.some(n => n.isPreSelectedWinner)
      })));
    };
    
    return () => {
      delete (window as any).getCurrentWinner;
      delete (window as any).getAllNames;
      delete (window as any).forceFinalWinner;
      delete (window as any).clearAllNames;
      delete (window as any).getRemovedNames;
      delete (window as any).testSpinWheelLogic;
    };
  }, [preSelectedWinner, names, gamePhase, showModal, winner, removedNames, getNamesBySection]);

  // Add a new name
  const addName = useCallback(() => {
    if (!newName.trim()) return;
    
    const nameEntries = newName
      .split(/[\n,;\s]+/)
      .map(name => name.trim())
      .filter(name => name.length > 0);
    
    if (nameEntries.length === 0) return;
    
    const newEntries: NameEntry[] = nameEntries.map((name, index) => ({
      id: `${Date.now()}-${index}`,
      name: name,
      sectionIndex: 0,
      isPreSelectedWinner: false
    }));
    
    setNames(prev => {
      const updated = [...prev, ...newEntries];
      const distributed = distributeNamesEvenly(updated);
      
      // Auto-check for AlexDhanaraj after names are distributed
      setTimeout(() => {
        autoSetAlexDhanarajWinner();
      }, 200);
      
      return distributed;
    });
    setNewName('');
  }, [newName, distributeNamesEvenly, autoSetAlexDhanarajWinner]);

  // Import names from CSV file
  const importFromCSV = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const csv = e.target?.result as string;
      const lines = csv.split('\n');
      const names: string[] = [];
      
      lines.forEach(line => {
        const columns = line.split(',').map(col => col.trim().replace(/"/g, ''));
        columns.forEach(col => {
          if (col && col.length > 0 && !col.match(/^\d+$/) && !col.includes('@')) {
            names.push(col);
          }
        });
      });
      
      const filteredNames = names.filter(name => name.length > 0);
      if (filteredNames.length > 0) {
        const newEntries: NameEntry[] = filteredNames.map((name, index) => ({
          id: `${Date.now()}-${index}`,
          name: name,
          sectionIndex: 0,
          isPreSelectedWinner: false
        }));
        
        setNames(prev => {
          const updated = [...prev, ...newEntries];
          // Auto-check for AlexDhanaraj after setting names
          setTimeout(() => autoSetAlexDhanarajWinner(), 100);
          return distributeNamesEvenly(updated);
        });
        
      }
    };
    reader.readAsText(file);
  }, [distributeNamesEvenly]);

  // Import names from Excel file (basic support)
  const importFromExcel = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result as string;
      // Basic Excel parsing - looks for tab-separated values
      const lines = data.split('\n');
      const names: string[] = [];
      
      lines.forEach(line => {
        const columns = line.split('\t').map(col => col.trim().replace(/"/g, ''));
        columns.forEach(col => {
          if (col && col.length > 0 && !col.match(/^\d+$/) && !col.includes('@')) {
            names.push(col);
          }
        });
      });
      
      const filteredNames = names.filter(name => name.length > 0);
      if (filteredNames.length > 0) {
        const newEntries: NameEntry[] = filteredNames.map((name, index) => ({
          id: `${Date.now()}-${index}`,
          name: name,
          sectionIndex: 0,
          isPreSelectedWinner: false
        }));
        
        setNames(prev => {
          const updated = [...prev, ...newEntries];
          // Auto-check for AlexDhanaraj after setting names
          setTimeout(() => autoSetAlexDhanarajWinner(), 100);
          return distributeNamesEvenly(updated);
        });
        
      }
    };
    reader.readAsText(file);
  }, [distributeNamesEvenly]);

  // Import names from spreadsheet data (paste from Excel/Google Sheets)
  const importFromSpreadsheetData = useCallback((data: string) => {
    const lines = data.split('\n');
    const names: string[] = [];
    
    lines.forEach(line => {
      // Handle both tab and comma separated values
      const columns = line.includes('\t') 
        ? line.split('\t').map(col => col.trim().replace(/"/g, ''))
        : line.split(',').map(col => col.trim().replace(/"/g, ''));
      
      columns.forEach(col => {
        if (col && col.length > 0 && !col.match(/^\d+$/) && !col.includes('@')) {
          names.push(col);
        }
      });
    });
    
    const filteredNames = names.filter(name => name.length > 0);
    if (filteredNames.length > 0) {
      const newEntries: NameEntry[] = filteredNames.map((name, index) => ({
        id: `${Date.now()}-${index}`,
        name: name,
        sectionIndex: 0,
        isPreSelectedWinner: false
      }));
      
      setNames(prev => {
        const updated = [...prev, ...newEntries];
        const distributed = distributeNamesEvenly(updated);
        
        // Auto-check for AlexDhanaraj after names are distributed
        setTimeout(() => {
          autoSetAlexDhanarajWinner();
        }, 200);
        
        return distributed;
      });
      
      return filteredNames.length;
    }
    return 0;
  }, [distributeNamesEvenly, autoSetAlexDhanarajWinner]);

  // Remove a name from the wheel
  const removeName = useCallback((id: string) => {
    setNames(prev => {
      const nameToRemove = prev.find(name => name.id === id);
      if (nameToRemove) {
        // Add to removed names list
        setRemovedNames(prevRemoved => [...prevRemoved, {
          id: nameToRemove.id,
          name: nameToRemove.name,
          removedAt: new Date(),
          wasWinner: nameToRemove.isPreSelectedWinner
        }]);
      }
      const filtered = prev.filter(name => name.id !== id);
      return distributeNamesEvenly(filtered);
    });
  }, [distributeNamesEvenly]);

  // Shuffle all names randomly and redistribute
  const shuffleNames = useCallback(() => {
    setNames(prev => distributeNamesEvenly(prev));
  }, [distributeNamesEvenly]);

  // Calculate the winning section based on final rotation
  const calculateWinningSection = useCallback((finalRotation: number, sectionCount: number) => {
    const normalizedRotation = finalRotation % 360;
    const sectionAngle = 360 / sectionCount;
    const winningSection = Math.floor((360 - normalizedRotation) / sectionAngle) % sectionCount;
    return winningSection;
  }, []);

  // Get names organized by section
  const namesBySection = getNamesBySection(names);
  const currentSectionCount = namesBySection.length;

  // Calculate exact rotation to land on winner's slice for final spin
  const calculateWinnerRotation = useCallback((winnerSection: number, sectionCount: number) => {
    // Calculate the center angle of the winner's section
    const sectionAngle = 360 / sectionCount;
    const winnerCenterAngle = winnerSection * sectionAngle + (sectionAngle / 2);
    
    // Calculate the rotation needed to land the needle on the winner's section
    // The needle points to the top (0 degrees), so we need to rotate so the winner's section is at the top
    const targetRotation = 360 - winnerCenterAngle;
    
    // Add multiple full rotations for dramatic effect
    const fullRotations = 25 + Math.random() * 10; // 25-35 full rotations
    const finalRotation = (fullRotations * 360) + targetRotation;
    
    return {
      finalRotation,
      duration: 6 + Math.random() * 2, // 6-8 seconds for final spin
      easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      winnerCenterAngle,
      targetRotation
    };
  }, []);

  // Generate smooth rotation animation with consistent speed and ease-out
  const generateSmoothRotation = useCallback((targetRotation: number, isFinalSpin: boolean) => {
    // Base rotation parameters
    const baseRotations = 20 + Math.random() * 15; // 20-35 full rotations
    const baseDuration = 4 + Math.random() * 2; // 4-6 seconds base duration
    
    // For final spin, add extra rotations for dramatic effect
    const finalRotations = isFinalSpin ? baseRotations + 5 : baseRotations;
    const finalDuration = isFinalSpin ? baseDuration + 1 : baseDuration;
    
    // Calculate final rotation with smooth deceleration
    const finalRotation = finalRotations * 360 + targetRotation;
    
    // Create smooth easing curve (fast start, slow finish)
    const easingCurve = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    
    return {
      finalRotation,
      duration: finalDuration,
      easing: easingCurve,
      isFinalSpin
    };
  }, []);

  // Simple and working spin wheel animation
  const spinWheel = useCallback(() => {
    if (isSpinning || names.length === 0) return;
    
    // Validate pre-selected winner before spinning
    if (preSelectedWinner && !validatePreSelectedWinner()) {
      alert('❌ Pre-selected winner validation failed! Please reset the game.');
      return;
    }
    
    // Security: Prevent manual manipulation
    if (!secureWinnerValidation()) {
      alert('⚠️ Winner validation issue detected. The game will continue with restored settings.');
    }
    
    setIsSpinning(true);
    setWinner(null);
    
    // Start realistic tick sound system
    startTickSound(20); // Start with 20 ticks per second
    
    // Check if this is the final spin (when only 2 names are left)
    const nonWinnerNames = names.filter(name => !name.isPreSelectedWinner);
    const isFinalSpin = nonWinnerNames.length === 1; // Final spin when only 1 non-winner + 1 winner = 2 total
    
    let targetSection: number;
    let finalRotation: number;
    
    if (isFinalSpin) {
      // FINAL SPIN: Force the wheel to land on the pre-selected winner
      const winnerSection = names.findIndex(name => name.isPreSelectedWinner);
      if (winnerSection === -1) {
        console.error('❌ Pre-selected winner not found in final spin!');
        setIsSpinning(false);
        return;
      }
      
      targetSection = winnerSection;
      
      // Use precise winner rotation calculation for guaranteed landing
      const rotationData = calculateWinnerRotation(winnerSection, currentSectionCount);
      finalRotation = rotationData.finalRotation;
      
      console.log('🏆 FINAL SPIN: Forcing wheel to land on winner:', {
        winnerSection,
        winnerCenterAngle: rotationData.winnerCenterAngle,
        targetRotation: rotationData.targetRotation,
        finalRotation,
        duration: rotationData.duration
      });
    } else {
      // REGULAR SPIN: Never land on the pre-selected winner
      // Create a list of safe sections (those without the pre-selected winner)
      const safeSections: number[] = [];
      for (let i = 0; i < currentSectionCount; i++) {
        const sectionNames = namesBySection[i];
        const hasWinner = sectionNames.some(name => name.isPreSelectedWinner);
        if (!hasWinner) {
          safeSections.push(i);
        }
      }
      
      // If no safe sections exist, this shouldn't happen but handle gracefully
      if (safeSections.length === 0) {
        console.error('❌ No safe sections found for elimination!');
        setIsSpinning(false);
        return;
      }
      
      // Randomly select from safe sections
      targetSection = safeSections[Math.floor(Math.random() * safeSections.length)];
      
      const sectionAngle = 360 / currentSectionCount;
      const targetAngle = targetSection * sectionAngle;
      
      // Use smooth rotation generator for regular spin
      const rotationData = generateSmoothRotation(targetAngle, false);
      finalRotation = rotationData.finalRotation;
      
      console.log('🔄 REGULAR SPIN: Eliminating from safe section:', {
        targetSection,
        targetAngle,
        finalRotation,
        safeSectionsCount: safeSections.length,
        duration: rotationData.duration
      });
    }
    
    console.log('🎯 Starting spin animation:', { 
      finalRotation, 
      currentSectionCount, 
      targetSection, 
      isFinalSpin
    });
    
    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    // Clean CSS-based animation without test rotation hack
    if (wheelRef.current) {
      let rotationData: any;
      
      if (isFinalSpin) {
        // Use precise winner rotation for final spin
        rotationData = calculateWinnerRotation(targetSection, currentSectionCount);
      } else {
        // Use smooth rotation generator for regular spin
        const sectionAngle = 360 / currentSectionCount;
        const targetAngle = targetSection * sectionAngle;
        rotationData = generateSmoothRotation(targetAngle, false);
      }
      
      console.log('🚀 Starting CSS animation for', rotationData.duration, 'seconds');
      console.log('🔍 Wheel element found:', wheelRef.current);
      console.log('🎯 Target rotation:', rotationData.finalRotation, 'degrees');
      
      // Apply smooth rotation immediately
      wheelRef.current.style.transition = `transform ${rotationData.duration}s ${rotationData.easing}`;
      wheelRef.current.style.transform = `rotate(${rotationData.finalRotation}deg)`;
      
      console.log('🎯 Rotation applied:', wheelRef.current.style.transform);
      
      // Update state
      setCurrentRotation(rotationData.finalRotation);
      
      // Handle completion after animation
      setTimeout(() => {
        console.log('✅ CSS animation complete. Final rotation:', rotationData.finalRotation);
        handleSpinComplete(rotationData.finalRotation, isFinalSpin);
      }, rotationData.duration * 1000);
      
    } else {
      console.error('❌ Wheel element not found!');
      setIsSpinning(false);
    }
    
  }, [names, isSpinning, calculateWinningSection, distributeNamesEvenly, namesBySection, currentSectionCount, setRemovedNames, preSelectedWinner, validatePreSelectedWinner, secureWinnerValidation, generateSmoothRotation, calculateWinnerRotation]);

  // Strict check: Ensure wheel never lands on winner during elimination spins
  const strictWinnerCheck = useCallback((finalRotation: number, sectionCount: number) => {
    const winningSection = calculateWinningSection(finalRotation, sectionCount);
    const sectionNames = namesBySection[winningSection];
    const hasWinner = sectionNames.some(name => name.isPreSelectedWinner);
    
    if (hasWinner) {
      console.warn('⚠️ Wheel landed on winner section during elimination spin! This should not happen.');
      return false; // Indicates winner was selected
    }
    
    return true; // Indicates safe section was selected
  }, [calculateWinningSection, namesBySection]);

  // Monitor game progress and ensure winner integrity
  const monitorGameProgress = useCallback(() => {
    const totalNames = names.length;
    const winnerNames = names.filter(name => name.isPreSelectedWinner);
    const nonWinnerNames = names.filter(name => !name.isPreSelectedWinner);
    
    console.log('📊 Game Progress Monitor:', {
      totalNames,
      winnerCount: winnerNames.length,
      nonWinnerCount: nonWinnerNames.length,
      winnerNames: winnerNames.map(n => n.name),
      isFinalRound: nonWinnerNames.length === 0,
      gamePhase
    });
    
    // Validate winner integrity
    if (winnerNames.length > 1) {
      console.warn('⚠️ Multiple winners detected, this should not happen!');
    }
    
    if (winnerNames.length === 0 && preSelectedWinner) {
      console.warn('⚠️ Winner flag was lost, attempting to restore...');
      secureWinnerValidation();
    }
  }, [names, preSelectedWinner, gamePhase, secureWinnerValidation]);

  // Optimized elimination function for large participant lists
  const performOptimizedElimination = useCallback((eligibleNames: NameEntry[], totalMembers: number) => {
    let namesToRemove: number;
    
    // Efficient elimination strategy based on list size
    if (totalMembers <= 6) {
      namesToRemove = 1; // Remove 1 at a time for small lists
    } else if (totalMembers <= 50) {
      namesToRemove = Math.max(1, Math.floor(totalMembers * 0.2)); // Remove 20% for medium lists
    } else if (totalMembers <= 500) {
      namesToRemove = Math.max(1, Math.floor(totalMembers * 0.15)); // Remove 15% for large lists
    } else {
      // For very large lists (up to 5000), use logarithmic scaling
      namesToRemove = Math.max(1, Math.floor(totalMembers * 0.1)); // Remove 10% for very large lists
    }
    
    // Ensure we don't remove more than available
    namesToRemove = Math.min(namesToRemove, eligibleNames.length);
    
    console.log('🗑️ Removing', namesToRemove, 'names from', totalMembers, 'total members');
    
    // Efficient selection using Fisher-Yates shuffle
    const shuffledEligible = [...eligibleNames];
    for (let i = shuffledEligible.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledEligible[i], shuffledEligible[j]] = [shuffledEligible[j], shuffledEligible[i]];
    }
    
    return shuffledEligible.slice(0, namesToRemove);
  }, []);

  // Handle spin completion (extracted for reuse) - Fixed with comprehensive error handling
  const handleSpinComplete = useCallback((finalRotation: number, isFinalSpin: boolean) => {
    try {
      console.log('✅ Spin complete. Final rotation:', finalRotation.toFixed(1), 'deg');
      console.log('🎯 Is final spin:', isFinalSpin);
      
      // Stop tick sound when wheel stops
      stopTickSound();
      
      if (isFinalSpin) {
        // FINAL SPIN: Show winner popup
        const finalWinner = names.find(name => name.isPreSelectedWinner);
        if (finalWinner) {
          console.log('🏆 FINAL WINNER:', finalWinner.name);
          setWinner(finalWinner.name);
          setShowModal(true);
          setGamePhase('final-winner');
          
          // Play celebration sound
          generateBlinkSound();
        }
        setIsSpinning(false);
        return;
      }
      
      // REGULAR SPIN: Handle elimination logic
      // Determine winner
      const actualWinningSection = calculateWinningSection(finalRotation, currentSectionCount);
      const namesInWinningSection = namesBySection[actualWinningSection];
      
      console.log('🎯 Winning section:', actualWinningSection, 'Names:', namesInWinningSection);
      
      // STRICT CHECK: If wheel landed on winner section during elimination, re-spin automatically
      const hasWinner = namesInWinningSection.some(name => name.isPreSelectedWinner);
      if (hasWinner) {
        console.warn('⚠️ CRITICAL: Wheel landed on winner section during elimination spin! Auto re-spinning...');
        
        // Reset spinning state and trigger a new spin
        setIsSpinning(false);
        
        // Small delay to prevent rapid re-spinning
        setTimeout(() => {
          console.log('🔄 Auto re-spinning due to winner section selection...');
          spinWheel();
        }, 500);
        
        return;
      }
      
      // Play blink sound when section is selected
      generateBlinkSound();
      
      if (namesInWinningSection.length === 0) {
        console.log('❌ No names in winning section');
        setIsSpinning(false);
        return;
      }
      
      // CRITICAL: Never eliminate the pre-selected winner
      const eligibleNames = namesInWinningSection.filter(name => !name.isPreSelectedWinner);
      
      if (eligibleNames.length === 0) {
        console.log('⚠️ Only pre-selected winner in winning section, skipping elimination');
        setIsSpinning(false);
        return;
      }
      
      const totalMembers = names.filter(name => !name.isPreSelectedWinner).length;
      
      // Check if we're at the final round (only pre-selected winner remains)
      if (totalMembers === 0) {
        console.log('🏆 Final winner reached!');
        const finalWinner = names.find(name => name.isPreSelectedWinner);
        if (finalWinner) {
          setWinner(finalWinner.name);
          setShowModal(true);
          setGamePhase('final-winner');
        }
        setIsSpinning(false);
        return;
      }
      
      // Use optimized elimination function
      const selectedWinners = performOptimizedElimination(eligibleNames, totalMembers);
      
      setNames(prev => {
        const remainingNames = prev.filter(name => !selectedWinners.some(winner => winner.id === name.id));
        
        // Add eliminated names to removedNames list
        const newRemovedNames = selectedWinners.map(winner => ({
          id: winner.id,
          name: winner.name,
          removedAt: new Date(),
          wasWinner: winner.isPreSelectedWinner
        }));
        
        setRemovedNames(prevRemoved => {
          const updated = [...prevRemoved, ...newRemovedNames];
          return updated;
        });
        
        // Check if this spin resulted in final winner state
        if (remainingNames.length === 1 && remainingNames[0].isPreSelectedWinner) {
          console.log('🏆 Final winner after elimination:', remainingNames[0].name);
          const finalWinner = remainingNames[0];
          setWinner(finalWinner.name);
          setShowModal(true);
          setGamePhase('final-winner');
          return remainingNames;
        } else if (remainingNames.length > 1) {
          console.log('🔄 Redistributing', remainingNames.length, 'remaining names');
          const redistributed = distributeNamesEvenly(remainingNames);
          
          // Monitor progress after redistribution
          setTimeout(() => monitorGameProgress(), 100);
          
          return redistributed;
        }
        
        return remainingNames;
      });
      
      // Monitor progress after elimination
      setTimeout(() => monitorGameProgress(), 100);
      
    } catch (error) {
      console.error('❌ Error in handleSpinComplete:', error);
    } finally {
      // CRITICAL: Always reset isSpinning to false, regardless of success/failure
      setIsSpinning(false);
      console.log('🔄 isSpinning reset to false');
    }
  }, [calculateWinningSection, namesBySection, currentSectionCount, setRemovedNames, names, setWinner, setShowModal, setGamePhase, distributeNamesEvenly, stopTickSound, generateBlinkSound, performOptimizedElimination, monitorGameProgress, spinWheel]);

  // Reset the wheel to starting position
  const resetWheel = useCallback(() => {
    // Cancel any ongoing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    if (wheelRef.current) {
      wheelRef.current.style.transition = 'transform 0.3s ease-out';
      wheelRef.current.style.transform = 'rotate(0deg)';
    }
    
    setCurrentRotation(0);
    setWinner(null);
    setShowModal(false);
    setGamePhase('playing');
    
    setNames([]);
    setRemovedNames([]);
    setPreSelectedWinner('');
  }, []);

  // Close the winner modal
  const closeModal = useCallback(() => {
    setShowModal(false);
    setWinner(null);
  }, []);

  // Handle keyboard shortcuts (Mac-specific)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Normal spin shortcut (Command + Enter)
      if (e.metaKey && e.key === 'Enter') {
        e.preventDefault();
        spinWheel();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [spinWheel]);

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center py-4 relative overflow-hidden ${
      names.length >= 1000 ? 'px-40' : 'px-32'
    }`}>
      {/* Main header */}
      <div className="text-center mb-8 z-10 relative">
        {/* Floating decorative elements */}
        {/* <div className="absolute -top-4 -left-8 text-4xl animate-bounce" style={{ animationDelay: '0.2s' }}>⚡</div>
        <div className="absolute -top-4 -right-8 text-4xl animate-bounce" style={{ animationDelay: '0.4s' }}>🎯</div>
        <div className="absolute -bottom-4 -left-12 text-3xl animate-pulse" style={{ animationDelay: '0.6s' }}>⚡</div>
        <div className="absolute -bottom-4 -right-12 text-3xl animate-pulse" style={{ animationDelay: '0.8s' }}>🚀</div> */}
        
        <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 mb-4 drop-shadow-2xl animate-pulse">
          Spin and Win ⚡
        </h1>
        <div className="w-32 h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 mx-auto rounded-full animate-pulse mb-4"></div>
        
        <div className="bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 backdrop-blur-sm rounded-2xl px-8 py-4 border border-cyan-400/30 shadow-xl">
          <p className="text-cyan-200 text-lg font-semibold mb-2">
            {gamePhase === 'playing' ? (names.length <= 6 ? '🎯 Individual slices - Each name has its own section!' : names.length === 2 ? '🎯 Final spin - Last chance!' : 'Game in progress - Keep spinning!') : '🏆 Final winner revealed!'}
            {preSelectedWinner && (
              <span className="ml-2 text-green-400 font-semibold animate-pulse">🎯 Winner Set</span>
            )}
          </p>
          <p className="text-blue-200 text-base font-medium">
             Total names: <span className="text-cyan-300 font-bold">{names.length}</span>
          </p>
        </div>

      </div>

      {/* Wheel section */}
      <div className="relative z-10 flex items-center justify-center">
        {/* Left side - Names counter display */}
        <div className={`absolute top-0 z-50 ${
          names.length >= 1000 ? '-left-[28rem]' : 
          names.length >= 100 ? '-left-[24rem]' : 
          names.length >= 10 ? '-left-96' : '-left-80'
        }`}>
          <div className="text-center mb-4 p-6 bg-black/40 backdrop-blur-md rounded-3xl border-2 border-white/30 shadow-2xl">
            <div className={`font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-400 to-red-500 mb-4 animate-pulse drop-shadow-2xl ${
              names.length >= 10000 ? 'text-6xl' :
              names.length >= 1000 ? 'text-7xl' :
              names.length >= 100 ? 'text-8xl' : 'text-9xl'
            }`}>
              {names.length}
            </div>
            <div className={`font-bold text-white uppercase tracking-wider mb-4 drop-shadow-lg ${
              names.length >= 1000 ? 'text-xl' : 'text-3xl'
            }`}>
              {names.length === 0 ? 'NO NAMES' : names.length === 1 ? 'PARTICIPANT' : 'PARTICIPANTS'}
            </div>
            
            {/* Dynamic status indicator */}
            {/* <div className="text-center">
              <div className={`inline-flex items-center px-6 py-3 rounded-full text-lg font-bold shadow-lg ${
                names.length === 0 
                  ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white border-2 border-gray-400'
                  : names.length <= 6
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-2 border-purple-300'
                  : names.length < 10
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-2 border-yellow-300'
                  : names.length < 50
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white border-2 border-orange-300'
                  : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white border-2 border-green-300'
              }`}>
                {names.length === 0 ? '🔄 READY TO LOAD' : 
                 names.length <= 6 ? '🎯 INDIVIDUAL SLICES' :
                 names.length < 10 ? '🎯 SMALL GROUP' :
                 names.length < 50 ? '🎪 MEDIUM EVENT' : '🏟️ LARGE EVENT'}
              </div>
            </div> */}
          </div>
        </div>

        {/* Centered Wheel container - Always stays in center */}
        <div className="relative w-96 h-96 bg-white/10 rounded-full border-4 border-white/20 flex items-center justify-center shadow-2xl">
          {/* Pointer arrow */}
          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 z-20">
            <div className="w-0 h-0 border-l-[24px] border-r-[24px] border-t-[48px] border-transparent border-t-red-500 drop-shadow-2xl"></div>
          </div>
          
          {/* The rotating wheel */}
          <div
            ref={wheelRef}
            className="relative w-80 h-80 rounded-full overflow-hidden cursor-pointer"
            style={{
              transform: `rotate(${currentRotation}deg)`,
              transformOrigin: 'center',
              willChange: 'transform',
              backfaceVisibility: 'hidden',
              transition: 'transform 0.1s ease-out',
            }}
            onClick={spinWheel}
          >
            {/* SVG-based wheel sections for perfect equal sizing */}
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 160 160"
              style={{ transform: 'rotate(-90deg)' }}
            >
              {Array.from({ length: currentSectionCount }).map((_, sectionIndex) => {
                const sectionAngle = 360 / currentSectionCount;
                const startAngle = sectionAngle * sectionIndex;
                const endAngle = startAngle + sectionAngle;
                
                // Convert angles to radians
                const startRad = (startAngle * Math.PI) / 180;
                const endRad = (endAngle * Math.PI) / 180;
                
                // Calculate arc coordinates
                const radius = 80;
                const centerX = 80;
                const centerY = 80;
                
                const x1 = centerX + radius * Math.cos(startRad);
                const y1 = centerY + radius * Math.sin(startRad);
                const x2 = centerX + radius * Math.cos(endRad);
                const y2 = centerY + radius * Math.sin(endRad);
                
                // Create path for pie slice
                const largeArcFlag = sectionAngle > 180 ? 1 : 0;
                const pathData = [
                  `M ${centerX} ${centerY}`,
                  `L ${x1} ${y1}`,
                  `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                  'Z'
                ].join(' ');
                
                // Calculate text position for names
                const textRadius = radius * 0.6;
                const textAngle = startAngle + sectionAngle / 2;
                const textRad = (textAngle * Math.PI) / 180;
                const textX = centerX + textRadius * Math.cos(textRad);
                const textY = centerY + textRadius * Math.sin(textRad);
                
                // Get names in this section
                const sectionNames = namesBySection[sectionIndex] || [];
                const displayName = sectionNames.length > 0 ? sectionNames[0].name : '';
                
                return (
                  <g key={sectionIndex}>
                    <path
                      d={pathData}
                      fill={sectionColors[sectionIndex]}
                      stroke="rgba(0,0,0,0.3)"
                      strokeWidth="2"
                    />
                    {/* Add name labels for individual slices */}
                    {names.length <= 6 && displayName && (
                      <text
                        x={textX}
                        y={textY}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-xs font-bold fill-white"
                        style={{
                          fontSize: names.length <= 3 ? '8px' : '6px',
                          textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                          transform: `rotate(${textAngle + 90}deg)`,
                          transformOrigin: `${textX}px ${textY}px`
                        }}
                      >
                        {displayName}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
            
            {/* Center hub */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-gray-800 rounded-full border-4 border-white/30 shadow-2xl flex items-center justify-center z-20">
              <div className="w-8 h-8 bg-red-500 rounded-full border-2 border-white shadow-lg"></div>
            </div>
          </div>
        </div>

        {/* Right side - Final names display (only when 20 or fewer names remain) */}
        {names.length <= 20 && names.length > 0 && (
          <div className={`absolute top-0 z-50 ${
            names.length <= 6 ? '-right-80' : '-right-96'
          }`}>
            <div className="text-center mb-4">
              <div className="text-2xl font-bold text-white mb-3">
                {names.length <= 6 ? '🎯 Individual Slices' : `🎯 Final ${names.length} Names`}
              </div>
              <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4 border-2 border-white/30 shadow-2xl max-h-80 overflow-y-auto">
                <div className="space-y-2">
                  {names.map((name, index) => (
                    <div key={name.id} className="text-white text-sm font-medium bg-white/10 rounded-lg px-3 py-2">
                      {index + 1}. {name.name}
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-xs text-gray-300 mt-2">
                {names.length <= 6 ? '🎯 Individual slices - Each name has its own section!' : `🎯 Final round - ${names.length} participants remaining!`}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Control buttons */}
      <div className="mt-8 flex flex-col sm:flex-row items-center gap-6 z-10">
        {/* SPIN Button */}
        <button
          onClick={spinWheel}
          disabled={isSpinning || names.length === 0 || gamePhase === 'final-winner'}
          className={`relative group px-12 py-6 rounded-2xl font-black text-2xl transition-all duration-500 transform hover:scale-110 hover:-translate-y-2 ${
            isSpinning || names.length === 0 || gamePhase === 'final-winner'
              ? 'bg-gradient-to-r from-gray-400 to-gray-500 cursor-not-allowed shadow-lg'
              : names.length <= 6
                ? 'bg-gradient-to-r from-purple-400 via-pink-500 to-rose-600 hover:from-purple-500 hover:via-pink-600 hover:to-rose-700 shadow-2xl hover:shadow-purple-500/50'
                : names.length === 2 
                  ? 'bg-gradient-to-r from-orange-400 via-red-500 to-pink-600 hover:from-orange-500 hover:via-red-600 hover:to-pink-700 shadow-2xl hover:shadow-orange-500/50'
                  : 'bg-gradient-to-r from-green-400 via-emerald-500 to-teal-600 hover:from-green-500 hover:via-emerald-600 hover:to-teal-700 shadow-2xl hover:shadow-green-500/50'
          } text-white border-4 border-transparent hover:border-white/30 overflow-hidden`}
        >
          {/* Animated background overlay */}
          <div className={`absolute inset-0 bg-gradient-to-r from-white/20 to-transparent transform -skew-x-12 transition-transform duration-500 group-hover:translate-x-full ${
            isSpinning || names.length === 0 || gamePhase === 'final-winner' ? 'opacity-0' : 'opacity-100'
          }`}></div>
          
          {/* Button content */}
          <div className="relative z-10 flex items-center gap-3">
                          <span className="text-3xl">
                {isSpinning ? '🔄' : gamePhase === 'final-winner' ? '🏆' : names.length <= 6 ? '🎯' : names.length === 2 ? '🎯' : '🎲'}
              </span>
              <span className="drop-shadow-lg">
                {isSpinning ? 'Spinning...' : gamePhase === 'final-winner' ? 'Game Complete!' : names.length <= 6 ? 'INDIVIDUAL SPIN!' : names.length === 2 ? 'FINAL SPIN!' : 'SPIN!'}
              </span>
          </div>
          
          {/* Glow effect */}
          <div className={`absolute inset-0 rounded-2xl blur-xl transition-all duration-500 ${
            isSpinning || names.length === 0 || gamePhase === 'final-winner'
              ? 'opacity-0'
              : names.length <= 6
                ? 'bg-purple-500/50 group-hover:bg-purple-400/70'
                : names.length === 2
                  ? 'bg-orange-500/50 group-hover:bg-orange-400/70'
                  : 'bg-green-500/50 group-hover:bg-green-400/70'
          }`}></div>
        </button>
        
        {/* SHUFFLE Button */}
        <button
          onClick={shuffleNames}
          disabled={names.length < 2 || gamePhase === 'final-winner'}
          className={`relative group px-10 py-6 rounded-2xl font-black text-xl transition-all duration-500 transform hover:scale-110 hover:-translate-y-2 ${
            names.length < 2 || gamePhase === 'final-winner'
              ? 'bg-gradient-to-r from-gray-400 to-gray-500 cursor-not-allowed shadow-lg'
              : 'bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600 hover:from-blue-500 hover:via-indigo-600 hover:to-purple-700 shadow-2xl hover:shadow-blue-500/50'
          } text-white border-4 border-transparent hover:border-white/30 overflow-hidden`}
        >
          {/* Animated background overlay */}
          <div className={`absolute inset-0 bg-gradient-to-r from-white/20 to-transparent transform -skew-x-12 transition-transform duration-500 group-hover:translate-x-full ${
            names.length < 2 || gamePhase === 'final-winner' ? 'opacity-0' : 'opacity-100'
          }`}></div>
          
          {/* Button content */}
          <div className="relative z-10 flex items-center gap-3">
            <span className="text-2xl">🔀</span>
            <span className="drop-shadow-lg">Shuffle</span>
          </div>
          
          {/* Glow effect */}
          <div className={`absolute inset-0 rounded-2xl blur-xl transition-all duration-500 ${
            names.length < 2 || gamePhase === 'final-winner'
              ? 'opacity-0'
              : 'bg-blue-500/50 group-hover:bg-blue-400/70'
          }`}></div>
        </button>
        
        {/* REMOVED NAMES Button - HIDDEN */}
        {/*
        <button
          onClick={() => setShowRemovedNames(!showRemovedNames)}
          className="relative group px-10 py-6 bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 hover:from-orange-600 hover:via-orange-700 hover:to-orange-800 text-white rounded-2xl font-black text-xl transition-all duration-500 transform hover:scale-110 hover:-translate-y-2 shadow-2xl hover:shadow-orange-500/50 border-4 border-transparent hover:border-white/30 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent transform -skew-x-12 transition-transform duration-500 group-hover:translate-x-full"></div>
          
          <div className="relative z-10 flex items-center gap-3">
            <span className="text-2xl">📋</span>
            <span className="drop-shadow-lg">Removed Names</span>
          </div>
          
          <div className="absolute inset-0 rounded-2xl blur-xl transition-all duration-500 bg-orange-500/50 group-hover:bg-orange-400/70"></div>
        </button>
        */}


        {/* RESET GAME Button */}
        <button
          onClick={resetWheel}
          disabled={gamePhase === 'final-winner'}
          className={`relative group px-10 py-6 rounded-2xl font-black text-xl transition-all duration-500 transform hover:scale-110 hover:-translate-y-2 shadow-2xl border-4 border-transparent hover:border-white/30 overflow-hidden ${
            gamePhase === 'final-winner'
              ? 'bg-gradient-to-r from-gray-400 to-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-red-500 via-red-600 to-red-700 hover:from-red-600 hover:via-red-700 hover:to-red-800 hover:shadow-red-500/50'
          } text-white`}
        >
          {/* Animated background overlay */}
          <div className={`absolute inset-0 bg-gradient-to-r from-white/20 to-transparent transform -skew-x-12 transition-transform duration-500 group-hover:translate-x-full ${
            gamePhase === 'final-winner' ? 'opacity-0' : 'opacity-100'
          }`}></div>
          
          {/* Button content */}
          <div className="relative z-10 flex items-center gap-3">
            <span className="text-2xl">🔄</span>
            <span className="drop-shadow-lg">Reset Game</span>
          </div>
          
          {/* Glow effect */}
          <div className={`absolute inset-0 rounded-2xl blur-xl transition-all duration-500 ${
            gamePhase === 'final-winner'
              ? 'opacity-0'
              : 'bg-red-500/50 group-hover:bg-red-400/70'
          }`}></div>
        </button>
      </div>

      {/* Name management section */}
      <div className="mt-8 w-full max-w-4xl z-10">
        {/* Add name input */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-white/20">
          <h3 className="text-xl font-bold text-white mb-4">Add Names</h3>
          
          {/* File import section */}
          <div className="mb-4 p-4 bg-white/5 rounded-xl border border-white/10">
            <h4 className="text-lg font-semibold text-white mb-3">📊 Import from Spreadsheet</h4>
            <div className="flex flex-wrap gap-3 items-center">

              
              {/* CSV File Upload */}
              <label className="cursor-pointer px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-lg font-medium transition-all duration-200 hover:scale-105">
                📁 Upload CSV
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => e.target.files?.[0] && importFromCSV(e.target.files[0])}
                  className="hidden"
                />
              </label>
              
              {/* Excel File Upload */}
              <label className="cursor-pointer px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg font-medium transition-all duration-200 hover:scale-105">
                📊 Upload Excel
                <input
                  type="file"
                  accept=".xls,.xlsx,.txt"
                  onChange={(e) => e.target.files?.[0] && importFromExcel(e.target.files[0])}
                  className="hidden"
                />
              </label>
              
              {/* Paste from Spreadsheet */}
              <button
                onClick={() => {
                  const data = prompt('Paste your spreadsheet data here (columns separated by tabs or commas):');
                  if (data) importFromSpreadsheetData(data);
                }}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white rounded-lg font-medium transition-all duration-200 hover:scale-105"
              >
                📋 Paste Data
              </button>
            </div>
            <p className="text-blue-200 text-sm mt-2">
              💡 Tip: Copy from Excel/Google Sheets and paste, or upload CSV/Excel files
            </p>
          </div>
          

        </div>

        {/* Hidden Pre-selector - Only visible when you know the secret key combination */}
        {false && (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-white/20">
            <h3 className="text-xl font-bold text-white mb-4">Pre-Select Winner (Hidden from Players)</h3>
            <div className="flex gap-3">
              <select
                value={preSelectedWinner}
                onChange={(e) => setPreSelectedWinnerHandler(e.target.value)}
                disabled={gamePhase === 'final-winner'}
                className="flex-1 px-4 py-3 rounded-xl bg-white/20 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-200"
              >
                <option value="">Select a pre-selected winner...</option>
                {names.map((name) => (
                  <option key={name.id} value={name.name}>
                    {name.name}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-purple-200 text-sm mt-2">
              {preSelectedWinner ? `✅ Winner pre-selected (hidden from players)` : 'Choose who you want to win the game!'}
            </p>
          </div>
        )}

        {/* Names by section */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <h3 className="text-xl font-bold text-white mb-4">
            {names.length <= 6 ? 'Individual Slices' : 'Names by Section'}
          </h3>
          {names.length === 0 ? (
            <p className="text-purple-200 text-center py-8">No names added yet. Add some names to start the elimination game!</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {namesBySection.map((sectionNames, sectionIndex) => (
                <div
                  key={sectionIndex}
                  className="p-4 rounded-xl border-2"
                  style={{
                    backgroundColor: `${sectionColors[sectionIndex]}20`,
                    borderColor: sectionColors[sectionIndex],
                  }}
                >
                  <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: sectionColors[sectionIndex] }}
                    ></div>
                    {names.length <= 6 ? `Slice ${sectionIndex + 1}` : `Section ${sectionIndex + 1}`}
                  </h4>
                  {sectionNames.length === 0 ? (
                    <p className="text-gray-400 text-sm italic">Empty</p>
                  ) : (
                    <div className="space-y-2">
                      {sectionNames.map((name) => (
                        <div
                          key={name.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-white/20"
                        >
                          <span className="text-white text-sm truncate">{name.name}</span>
                          <button
                            onClick={() => removeName(name.id)}
                            className="text-red-400 hover:text-red-300 transition-colors duration-200 text-sm hover:scale-110"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>





      {/* Winner celebration modal */}
      <AnimatePresence>
        {showModal && winner && (
          <motion.div 
            className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-50 p-4 overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
          {/* Confetti explosion effect */}
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: 150 }).map((_, i) => (
              <div
                key={`confetti-${i}`}
                className="absolute w-2 h-2 rounded-sm"
                style={{
                  left: '50%',
                  top: '50%',
                  backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#FF69B4', '#00CED1'][i % 10],
                  transform: `translate(-50%, -50%) rotate(${Math.random() * 360}deg)`,
                  animation: `confetti-fall ${1.5 + Math.random() * 2}s ease-out forwards`,
                  animationDelay: `${Math.random() * 0.8}s`,
                  opacity: 0
                }}
              />
            ))}
          </div>

          {/* Floating celebration emojis */}
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={`emoji-${i}`}
                className="absolute text-4xl animate-bounce"
                style={{
                  left: `${10 + Math.random() * 80}%`,
                  top: `${10 + Math.random() * 80}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${2 + Math.random() * 2}s`
                }}
              >
                {['🎉', '🎊', '🏆', '🎯', '✨', '🌟', '💫', '🎈', '🎁', '🥳'][i % 10]}
              </div>
            ))}
          </div>

          {/* Main celebration container */}
          <motion.div 
            className="relative bg-gradient-to-br from-purple-600 via-pink-500 to-cyan-500 rounded-3xl pt-16 pb-8 px-8 md:pt-20 md:pb-12 md:px-12 max-w-4xl w-full text-center shadow-2xl border-4 border-white/20 backdrop-blur-md transform overflow-hidden"
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ 
              duration: 0.6, 
              ease: "easeOut",
              delay: 0.2
            }}
          >
            {/* Animated background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 via-pink-500/20 to-cyan-500/20 animate-pulse"></div>
            
            {/* Glowing border effect */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 opacity-20 blur-xl animate-pulse"></div>

            {/* Close button */}
            <button
              onClick={closeModal}
              className="absolute top-6 right-6 w-12 h-12 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white rounded-full flex items-center justify-center text-xl font-bold transition-all duration-300 hover:scale-110 hover:shadow-lg z-10 border border-white/30"
            >
              ✖
            </button>

            {/* Main Celebration Header */}
            <motion.div 
              className="relative z-10 mb-8 text-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              {/* Main Celebration Title */}
              <motion.div 
                className="relative mb-6"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.6, type: "spring", stiffness: 200 }}
              >
                <h2 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-pink-300 to-cyan-300 mb-4 drop-shadow-2xl">
                  {gamePhase === 'final-winner' ? '🎉 CELEBRATE! 🎉' : '🎯 WINNER! 🎯'}
                </h2>
                
                {/* Celebration Subtitle */}
                <motion.div 
                  className="bg-white/10 backdrop-blur-md rounded-2xl px-6 py-3 border border-white/20 mb-4 inline-block"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.8 }}
                >
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-2">
                    {gamePhase === 'final-winner' ? '🏆 ULTIMATE VICTORY! 🏆' : '🎯 Section Champion!'}
                  </h3>
                  <p className="text-white/90 font-medium text-sm md:text-base">
                    {gamePhase === 'final-winner' ? 'The final champion has been crowned!' : 'Congratulations on your success!'}
                  </p>
                </motion.div>
              </motion.div>
            </motion.div>

            {/* Winner name with special effects */}
            <motion.div 
              className="relative z-10 mb-8"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.0 }}
            >
              <div className="relative">
                {/* Glowing background for winner name */}
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-r from-purple-400/30 via-pink-400/30 to-cyan-400/30 rounded-3xl blur-2xl"
                  animate={{ 
                    scale: [1, 1.1, 1],
                    opacity: [0.3, 0.6, 0.3]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                ></motion.div>
                
                {/* Winner name container */}
                <motion.div 
                  className="relative bg-white/10 backdrop-blur-md rounded-3xl p-6 md:p-8 border border-white/20"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.8, delay: 1.2, type: "spring", stiffness: 150 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <motion.div 
                    className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-pink-300 to-cyan-300 mb-4 drop-shadow-2xl"
                    animate={{ 
                      scale: [1, 1.05, 1],
                      textShadow: [
                        "0 0 20px rgba(255, 255, 255, 0.3)",
                        "0 0 40px rgba(255, 255, 255, 0.6)",
                        "0 0 20px rgba(255, 255, 255, 0.3)"
                      ]
                    }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    {winner}
                  </motion.div>
                  <motion.div 
                    className="text-lg md:text-2xl text-white/90 font-semibold"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: 1.4 }}
                  >
                    {gamePhase === 'final-winner' 
                      ? '🏆 FINAL CHAMPION 🏆' 
                      : '🎯 Section Winner!'}
                  </motion.div>
                </motion.div>
              </div>
            </motion.div>

            {/* Celebration message */}
            <motion.div 
              className="relative z-10 mb-8"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.6 }}
            >
              <motion.div 
                className="bg-white/10 backdrop-blur-md rounded-2xl px-6 py-4 border border-white/20 inline-block"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.3 }}
              >
                <p className="text-lg md:text-xl text-white font-medium leading-relaxed">
                  {gamePhase === 'final-winner' 
                    ? `🎉 Congratulations ${winner}! 🎉` 
                    : 'Congratulations on being selected from the wheel! 🎲'}
                </p>
              </motion.div>
            </motion.div>

            {/* Prize Display */}
            <motion.div 
              className="relative z-10 mb-8"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.8 }}
            >
              <motion.div 
                className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                <motion.h3 
                  className="text-2xl font-bold text-yellow-300 mb-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 2.0 }}
                >
                  🏆 GRAND PRIZE 🏆
                </motion.h3>
                <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
                  {/* iPhone Display */}
                  <motion.div 
                    className="relative"
                    initial={{ scale: 0.8, rotate: -10 }}
                    animate={{ scale: 1, rotate: 6 }}
                    transition={{ duration: 1.0, delay: 2.2, type: "spring", stiffness: 100 }}
                    whileHover={{ scale: 1.1, rotate: 0 }}
                  >
                    <div className="relative w-32 h-64 bg-gradient-to-b from-slate-800 via-slate-700 to-slate-800 rounded-3xl border-2 border-slate-600 shadow-2xl">
                      <div className="absolute inset-1 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl border border-slate-500">
                        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-12 h-5 bg-black rounded-full border border-slate-400"></div>
                        <div className="text-white text-center pt-8">
                          <div className="text-2xl mb-1">📱</div>
                          <div className="text-xs font-bold">iPhone</div>
                          <div className="text-xs text-blue-200">16 Pro</div>
                        </div>
                        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-16 h-1 bg-white rounded-full opacity-70"></div>
                      </div>
                    </div>
                    
                    {/* Floating sparkles */}
                    <motion.div 
                      className="absolute -top-2 -left-2 text-lg"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    >
                      ✨
                    </motion.div>
                    <motion.div 
                      className="absolute -top-2 -right-2 text-lg"
                      animate={{ rotate: -360 }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                    >
                      ⭐
                    </motion.div>
                    <motion.div 
                      className="absolute -bottom-2 -left-2 text-lg"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
                    >
                      💎
                    </motion.div>
                    <motion.div 
                      className="absolute -bottom-2 -right-2 text-lg"
                      animate={{ rotate: -360 }}
                      transition={{ duration: 2.8, repeat: Infinity, ease: "linear" }}
                    >
                      🌟
                    </motion.div>
                  </motion.div>
                  
                  {/* Prize Description */}
                  <motion.div 
                    className="text-center md:text-left"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 2.4 }}
                  >
                    <h4 className="text-xl font-bold text-yellow-300 mb-2">🎁 CONGRATULATIONS!</h4>
                    <p className="text-white/90 font-medium text-sm md:text-base">
                      You've won the <span className="text-yellow-300 font-bold">iPhone 16 Pro</span>! 
                      The latest flagship device is yours! 🚀
                    </p>
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>

            {/* Bottom decoration */}
            <motion.div 
              className="relative z-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 2.6 }}
            >
              <div className="flex justify-center space-x-2">
                {['from-purple-400', 'from-pink-400', 'from-cyan-400', 'from-yellow-400', 'from-green-400'].map((color, i) => (
                  <motion.div 
                    key={i}
                    className={`w-3 h-3 bg-gradient-to-r ${color} to-white rounded-full`}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ 
                      duration: 0.4, 
                      delay: 2.8 + (i * 0.1),
                      type: "spring",
                      stiffness: 200
                    }}
                    whileHover={{ scale: 1.5 }}
                  ></motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>

      {/* Removed Names Modal */}
      {showRemovedNames && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-md rounded-3xl p-8 max-w-4xl w-full max-h-[80vh] overflow-y-auto shadow-2xl border-4 border-orange-300 relative">
            {/* X Button - Top Right Corner */}
            <button
              onClick={() => setShowRemovedNames(false)}
              className="absolute top-4 right-4 w-10 h-10 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-full flex items-center justify-center text-xl font-bold transition-all duration-300 hover:scale-110 hover:shadow-lg z-10"
            >
              ✖
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <h2 className="text-4xl font-black text-orange-600 mb-2">📋 Removed Names</h2>
              <div className="w-24 h-1 bg-gradient-to-r from-orange-400 to-red-500 mx-auto rounded-full"></div>
              <p className="text-gray-600 text-lg mt-3">
                Names that have been eliminated from the wheel
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gradient-to-r from-orange-100 to-orange-200 rounded-2xl p-4 text-center border-2 border-orange-300">
                <div className="text-3xl font-bold text-orange-600">{removedNames.length}</div>
                <div className="text-orange-700 font-semibold">Total Removed</div>
              </div>
              <div className="bg-gradient-to-r from-blue-100 to-blue-200 rounded-2xl p-4 text-center border-2 border-blue-300">
                <div className="text-3xl font-bold text-blue-600">
                  {removedNames.filter(n => !n.wasWinner).length}
                </div>
                <div className="text-blue-700 font-semibold">Regular Names</div>
              </div>
            </div>

            {/* Names List */}
            {removedNames.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎯</div>
                <h3 className="text-2xl font-bold text-gray-600 mb-2">No Names Removed Yet</h3>
                <p className="text-gray-500">Start spinning the wheel to see eliminated names here!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {removedNames.map((removedName, index) => (
                  <div
                    key={removedName.id}
                    className="p-4 rounded-2xl border-2 transition-all duration-300 hover:scale-105 bg-gradient-to-r from-gray-50 to-gray-100 border-gray-300 shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold bg-gray-500 text-white">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-bold text-lg text-gray-700">
                            {removedName.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            Removed: {removedName.removedAt.toLocaleTimeString()}
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            )}


          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 text-center text-purple-300 text-lg z-10">
        <p className="bg-white/10 backdrop-blur-sm rounded-2xl px-6 py-3 border border-white/20">
          {names.length <= 6 ? '🎯 Individual slices - Each name has its own section!' : names.length === 2 ? '🎯 Final round - Last spin determines the winner!' : '✨ Spin to eliminate sections until one winner remains! ✨'}
        </p>
      </div>
    </div>
  );
};

export default SpinWheel;
