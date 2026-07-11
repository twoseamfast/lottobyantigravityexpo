import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  Pressable, 
  Animated, 
  Dimensions, 
  Alert, 
  Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SymbolView } from 'expo-symbols';

const { width } = Dimensions.get('window');

// Color Theme
const theme = {
  bgGradient: ['#0f0c1b', '#15102a', '#090613'] as const,
  cardBg: 'rgba(255, 255, 255, 0.03)',
  cardBorder: 'rgba(255, 255, 255, 0.08)',
  primary: ['#8a2be2', '#b800ff'] as const,
  secondary: '#00f2fe',
  textMain: '#ffffff',
  textMuted: '#a0aec0',
};

// Lotto Ball Gradient Colors
const getBallGradients = (num: number): [string, string, ...string[]] => {
  if (num <= 10) return ['#ffe082', '#ffb300', '#ff6f00']; // Yellow
  if (num <= 20) return ['#90caf9', '#1e88e5', '#0d47a1']; // Blue
  if (num <= 30) return ['#ef9a9a', '#e53935', '#b71c1c']; // Red
  if (num <= 40) return ['#cfd8dc', '#78909c', '#37474f']; // Gray
  return ['#a5d6a7', '#43a047', '#1b5e20']; // Green
};

export default function HomeScreen() {
  // Sounds
  const popSound = useRef<Audio.Sound | null>(null);
  const chimeSound = useRef<Audio.Sound | null>(null);

  // States
  const [drawnMainNumbers, setDrawnMainNumbers] = useState<number[]>([]);
  const [drawnBonusNumber, setDrawnBonusNumber] = useState<number | null>(null);
  const [fixedNumbers, setFixedNumbers] = useState<Set<number>>(new Set());
  const [excludedNumbers, setExcludedNumbers] = useState<Set<number>>(new Set());
  const [isDrawing, setIsDrawing] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);

  // Animations
  const scaleAnims = useRef(Array(7).fill(0).map(() => new Animated.Value(0))).current;
  const optionsHeightAnim = useRef(new Animated.Value(0)).current;

  // Sound preloading
  useEffect(() => {
    async function loadAudio() {
      try {
        const { sound: pop } = await Audio.Sound.createAsync(require('@/assets/sounds/pop.wav'));
        const { sound: chime } = await Audio.Sound.createAsync(require('@/assets/sounds/chime.wav'));
        popSound.current = pop;
        chimeSound.current = chime;
      } catch (error) {
        console.warn('Failed to load audio assets:', error);
      }
    }
    loadAudio();

    return () => {
      if (popSound.current) popSound.current.unloadAsync();
      if (chimeSound.current) chimeSound.current.unloadAsync();
    };
  }, []);

  const playPop = async () => {
    try {
      if (popSound.current) {
        await popSound.current.setPositionAsync(0);
        await popSound.current.playAsync();
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const playChime = async () => {
    try {
      if (chimeSound.current) {
        await chimeSound.current.setPositionAsync(0);
        await chimeSound.current.playAsync();
      }
    } catch (e) {
      console.warn(e);
    }
  };

  // Toggle Accordion Options Panel
  const toggleOptions = () => {
    setIsOptionsOpen(!isOptionsOpen);
    Animated.timing(optionsHeightAnim, {
      toValue: isOptionsOpen ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  // Cycle states: Normal -> Fixed (Included) -> Excluded -> Normal
  const handleNumberGridPress = (num: number) => {
    if (isDrawing) return;

    const newFixed = new Set(fixedNumbers);
    const newExcluded = new Set(excludedNumbers);

    if (newFixed.has(num)) {
      newFixed.delete(num);
      newExcluded.add(num);
    } else if (newExcluded.has(num)) {
      newExcluded.delete(num);
    } else {
      if (newFixed.size >= 5) {
        Alert.alert('알림', '고정수는 최대 5개까지만 선택할 수 있습니다.');
        return;
      }
      newFixed.add(num);
    }

    setFixedNumbers(newFixed);
    setExcludedNumbers(newExcluded);
  };

  const handleReset = () => {
    if (isDrawing) return;
    setDrawnMainNumbers([]);
    setDrawnBonusNumber(null);
    setFixedNumbers(new Set());
    setExcludedNumbers(new Set());
    scaleAnims.forEach(anim => anim.setValue(0));
  };

  // Lotto Drawing sequence
  const drawLottoNumbers = async () => {
    if (isDrawing) return;

    // Build available pool
    const availablePool: number[] = [];
    for (let i = 1; i <= 45; i++) {
      if (!excludedNumbers.has(i) && !fixedNumbers.has(i)) {
        availablePool.push(i);
      }
    }

    const requiredRandomCount = 6 - fixedNumbers.size;
    const totalNeededFromPool = requiredRandomCount + 1; // Main + Bonus

    if (availablePool.length < totalNeededFromPool) {
      Alert.alert(
        '오류',
        `제외수가 너무 많아 번호를 생성할 수 없습니다.\n사용 가능한 번호가 최소 ${totalNeededFromPool}개 필요합니다.`
      );
      return;
    }

    setIsDrawing(true);
    setDrawnMainNumbers([]);
    setDrawnBonusNumber(null);
    scaleAnims.forEach(anim => anim.setValue(0));

    // Choose main numbers
    const chosenMain = Array.from(fixedNumbers);
    const shuffledPool = [...availablePool].sort(() => Math.random() - 0.5);

    for (let i = 0; i < requiredRandomCount; i++) {
      chosenMain.push(shuffledPool.pop()!);
    }
    chosenMain.sort((a, b) => a - b);

    // Choose bonus number
    const chosenBonus = shuffledPool.pop()!;

    // Animate drawing sequence
    for (let i = 0; i < 6; i++) {
      await new Promise(resolve => setTimeout(resolve, 350));
      setDrawnMainNumbers(prev => [...prev, chosenMain[i]]);
      playPop();
      Animated.spring(scaleAnims[i], {
        toValue: 1,
        bounciness: 12,
        useNativeDriver: true,
      }).start();
    }

    // Draw Bonus
    await new Promise(resolve => setTimeout(resolve, 600));
    setDrawnBonusNumber(chosenBonus);
    playPop();
    Animated.spring(scaleAnims[6], {
      toValue: 1,
      bounciness: 12,
      useNativeDriver: true,
    }).start();

    // Final Success sound
    await new Promise(resolve => setTimeout(resolve, 200));
    playChime();

    // Save drawn list to storage
    try {
      const historyStr = await AsyncStorage.getItem('lotto_history') || '[]';
      const history = JSON.parse(historyStr);
      
      const record = {
        id: Date.now(),
        date: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        numbers: chosenMain,
        bonus: chosenBonus
      };
      
      history.unshift(record);
      if (history.length > 50) history.pop();
      await AsyncStorage.setItem('lotto_history', JSON.stringify(history));
    } catch (e) {
      console.warn('AsyncStorage save failed', e);
    }

    setIsDrawing(false);
  };

  // Helper Stats calculations
  const calculateSum = () => {
    if (drawnMainNumbers.length < 6) return '-';
    return drawnMainNumbers.reduce((a, b) => a + b, 0);
  };

  const calculateOddEven = () => {
    if (drawnMainNumbers.length < 6) return '-';
    const odds = drawnMainNumbers.filter(n => n % 2 !== 0).length;
    return `${odds} : ${6 - odds}`;
  };

  const calculateHighLow = () => {
    if (drawnMainNumbers.length < 6) return '-';
    const highs = drawnMainNumbers.filter(n => n >= 23).length;
    return `${highs} : ${6 - highs}`;
  };

  // Height interpolator for accordion dropdown
  const optionsHeight = optionsHeightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 260], // Clamped height of selector grid
  });

  return (
    <LinearGradient colors={theme.bgGradient} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>PREMIUM LOTTO</Text>
            <Text style={styles.headerSubtitle}>스마트하고 아름다운 번호 매칭 시스템</Text>
          </View>

          {/* Draw Board */}
          <View style={styles.drawBoard}>
            {/* Balls Row */}
            <View style={styles.ballsContainer}>
              {drawnMainNumbers.length === 0 && !isDrawing ? (
                <Text style={styles.emptyText}>번호 생성 버튼을 눌러주세요.</Text>
              ) : (
                <View style={styles.drawnRow}>
                  {drawnMainNumbers.map((num, idx) => (
                    <LottoBall key={`ball-${idx}`} number={num} scale={scaleAnims[idx]} />
                  ))}
                  
                  {drawnBonusNumber !== null && (
                    <Animated.View style={[styles.bonusWrapper, { opacity: scaleAnims[6] }]}>
                      <Text style={styles.bonusPlus}>+</Text>
                      <LottoBall number={drawnBonusNumber} scale={scaleAnims[6]} />
                    </Animated.View>
                  )}
                </View>
              )}
            </View>

            {/* Actions */}
            <View style={styles.btnRow}>
              <Pressable 
                onPress={drawLottoNumbers}
                disabled={isDrawing}
                style={({ pressed }) => [
                  styles.btn, 
                  styles.btnPrimaryContainer,
                  (pressed || isDrawing) && styles.btnPressed
                ]}
              >
                <LinearGradient colors={theme.primary} style={styles.btnPrimaryGrad}>
                  <Text style={styles.btnTextPrimary}>번호 생성하기</Text>
                </LinearGradient>
              </Pressable>

              <Pressable 
                onPress={handleReset}
                disabled={isDrawing}
                style={({ pressed }) => [
                  styles.btn, 
                  styles.btnSecondary,
                  (pressed || isDrawing) && styles.btnPressed
                ]}
              >
                <Text style={styles.btnTextSecondary}>초기화</Text>
              </Pressable>
            </View>

            {/* Stats Panel */}
            <View style={styles.statsContainer}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>번호 총합</Text>
                <Text style={styles.statValue}>{calculateSum()}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>홀짝 비율</Text>
                <Text style={styles.statValue}>{calculateOddEven()}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>고저 비율</Text>
                <Text style={styles.statValue}>{calculateHighLow()}</Text>
              </View>
            </View>

            {/* Accordion Filter Panel */}
            <View style={styles.accordionContainer}>
              <Pressable onPress={toggleOptions} style={styles.accordionHeader}>
                <Text style={styles.accordionTitle}>🔧 고정수 / 제외수 설정</Text>
                <SymbolView 
                  name="chevron.down" 
                  size={16} 
                  tintColor={theme.textMuted} 
                  style={{ transform: [{ rotate: isOptionsOpen ? '180deg' : '0deg' }] }}
                />
              </Pressable>

              <Animated.View style={[styles.accordionContent, { height: optionsHeight }]}>
                <ScrollView nestedScrollEnabled style={styles.gridScroll}>
                  <Text style={styles.instructionText}>
                    번호 터치: <Text style={{ color: theme.secondary, fontWeight: '700' }}>[고정]</Text> (하늘색, 최대 5개) / <Text style={{ color: '#ff8a80', fontWeight: '700' }}>[제외]</Text> (빨간색)
                  </Text>
                  
                  <View style={styles.numberGrid}>
                    {Array.from({ length: 45 }, (_, i) => i + 1).map(num => {
                      const isFixed = fixedNumbers.has(num);
                      const isExcluded = excludedNumbers.has(num);
                      return (
                        <Pressable
                          key={`grid-${num}`}
                          onPress={() => handleNumberGridPress(num)}
                          style={[
                            styles.gridCell,
                            isFixed && styles.gridCellFixed,
                            isExcluded && styles.gridCellExcluded
                          ]}
                        >
                          <Text style={[
                            styles.gridCellText,
                            isFixed && styles.gridCellTextFixed,
                            isExcluded && styles.gridCellTextExcluded
                          ]}>
                            {num}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              </Animated.View>
            </View>

          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

// Custom Lotto Ball Component
const LottoBall = ({ number, scale }: { number: number, scale: Animated.Value }) => {
  return (
    <Animated.View style={[styles.ballOutline, { transform: [{ scale }] }]}>
      <LinearGradient 
        colors={getBallGradients(number)} 
        style={styles.ballGrad}
        start={{ x: 0.2, y: 0.2 }}
        end={{ x: 0.8, y: 0.8 }}
      >
        <Text style={styles.ballText}>{number}</Text>
        <View style={styles.ballHighlight} />
      </LinearGradient>
    </Animated.View>
  );
};

// Styling
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginVertical: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -1,
  },
  headerSubtitle: {
    fontSize: 13,
    color: theme.textMuted,
    marginTop: 4,
  },
  drawBoard: {
    width: '100%',
    maxWidth: 600,
    backgroundColor: theme.cardBg,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  ballsContainer: {
    minHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  emptyText: {
    color: theme.textMuted,
    fontStyle: 'italic',
    fontSize: 14,
  },
  drawnRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  bonusWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bonusPlus: {
    color: theme.textMuted,
    fontSize: 20,
    fontWeight: '700',
  },
  // Lotto Ball styles
  ballOutline: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 5,
  },
  ballGrad: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  ballText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  ballHighlight: {
    position: 'absolute',
    top: 3,
    left: 8,
    width: 12,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 6,
    transform: [{ rotate: '-15deg' }],
  },
  // Button styles
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  btn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  btnPrimaryContainer: {
    elevation: 4,
  },
  btnPrimaryGrad: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnTextPrimary: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  btnSecondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  btnTextSecondary: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  // Stats
  statsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: theme.textMuted,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.secondary,
  },
  // Accordion
  accordionContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 16,
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  accordionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  accordionContent: {
    overflow: 'hidden',
  },
  gridScroll: {
    marginTop: 12,
  },
  instructionText: {
    fontSize: 11,
    color: theme.textMuted,
    marginBottom: 12,
  },
  numberGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'space-between',
    paddingBottom: 10,
  },
  gridCell: {
    width: (width - 72) / 9, // Fit 9 columns dynamically
    maxWidth: 40,
    aspectRatio: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridCellText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textMuted,
  },
  gridCellFixed: {
    backgroundColor: '#00f2fe',
    borderColor: 'transparent',
  },
  gridCellTextFixed: {
    color: '#0c0914',
    fontWeight: '800',
  },
  gridCellExcluded: {
    backgroundColor: 'rgba(211, 47, 47, 0.2)',
    borderColor: 'rgba(211, 47, 47, 0.4)',
  },
  gridCellTextExcluded: {
    color: '#ff8a80',
    textDecorationLine: 'line-through',
  },
});
