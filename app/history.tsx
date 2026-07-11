import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  Pressable, 
  Alert, 
  Dimensions 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';

const { width } = Dimensions.get('window');

// Color Theme (matching HomeScreen)
const theme = {
  bgGradient: ['#0f0c1b', '#15102a', '#090613'] as const,
  cardBg: 'rgba(255, 255, 255, 0.03)',
  cardBorder: 'rgba(255, 255, 255, 0.08)',
  textMain: '#ffffff',
  textMuted: '#a0aec0',
  secondary: '#00f2fe',
};

// Lotto Ball Gradient Colors
const getBallGradients = (num: number): [string, string, ...string[]] => {
  if (num <= 10) return ['#ffe082', '#ffb300', '#ff6f00']; // Yellow
  if (num <= 20) return ['#90caf9', '#1e88e5', '#0d47a1']; // Blue
  if (num <= 30) return ['#ef9a9a', '#e53935', '#b71c1c']; // Red
  if (num <= 40) return ['#cfd8dc', '#78909c', '#37474f']; // Gray
  return ['#a5d6a7', '#43a047', '#1b5e20']; // Green
};

interface HistoryRecord {
  id: number;
  date: string;
  numbers: number[];
  bonus: number;
}

export default function HistoryScreen() {
  const [history, setHistory] = useState<HistoryRecord[]>([]);

  // Load history from local storage when focused
  const loadHistory = async () => {
    try {
      const historyStr = await AsyncStorage.getItem('lotto_history') || '[]';
      setHistory(JSON.parse(historyStr));
    } catch (e) {
      console.warn('Failed to load history:', e);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadHistory();
    }, [])
  );

  const handleClearHistory = () => {
    if (history.length === 0) return;
    
    Alert.alert(
      '기록 삭제',
      '모든 생성 기록을 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '삭제', 
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('lotto_history');
              setHistory([]);
            } catch (e) {
              console.warn(e);
            }
          }
        }
      ]
    );
  };

  const renderHistoryItem = ({ item }: { item: HistoryRecord }) => {
    return (
      <View style={styles.historyItem}>
        <Text style={styles.itemTime}>{item.date}</Text>
        
        <View style={styles.ballsRow}>
          {item.numbers.map((num, idx) => (
            <LinearGradient 
              key={`hball-${item.id}-${idx}`}
              colors={getBallGradients(num)}
              style={styles.historyBall}
              start={{ x: 0.2, y: 0.2 }}
              end={{ x: 0.8, y: 0.8 }}
            >
              <Text style={styles.ballText}>{num}</Text>
              <View style={styles.ballHighlight} />
            </LinearGradient>
          ))}
          
          <Text style={styles.plusSign}>+</Text>
          
          <LinearGradient 
            colors={getBallGradients(item.bonus)}
            style={styles.historyBall}
            start={{ x: 0.2, y: 0.2 }}
            end={{ x: 0.8, y: 0.8 }}
          >
            <Text style={styles.ballText}>{item.bonus}</Text>
            <View style={styles.ballHighlight} />
          </LinearGradient>
        </View>
      </View>
    );
  };

  return (
    <LinearGradient colors={theme.bgGradient} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        
        {/* Header Row */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>최근 생성 번호 기록</Text>
          <Pressable 
            onPress={handleClearHistory}
            style={({ pressed }) => [
              styles.clearBtn,
              pressed && styles.clearBtnPressed,
              history.length === 0 && { opacity: 0.5 }
            ]}
            disabled={history.length === 0}
          >
            <Text style={styles.clearBtnText}>전체 삭제</Text>
          </Pressable>
        </View>

        {/* History List */}
        <FlatList
          data={history}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderHistoryItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>아직 생성된 번호가 없습니다.</Text>
            </View>
          }
        />
        
      </SafeAreaView>
    </LinearGradient>
  );
}

// Styling
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  clearBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  clearBtnPressed: {
    opacity: 0.7,
  },
  clearBtnText: {
    color: theme.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.cardBg,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  itemTime: {
    color: theme.textMuted,
    fontSize: 11,
    fontWeight: '600',
    width: 60,
  },
  ballsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  historyBall: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  ballText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  ballHighlight: {
    position: 'absolute',
    top: 2,
    left: 5,
    width: 8,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 4,
    transform: [{ rotate: '-15deg' }],
  },
  plusSign: {
    color: theme.textMuted,
    fontSize: 14,
    fontWeight: '800',
    marginHorizontal: 2,
  },
  emptyContainer: {
    paddingVertical: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: theme.textMuted,
    fontStyle: 'italic',
    fontSize: 14,
  },
});
