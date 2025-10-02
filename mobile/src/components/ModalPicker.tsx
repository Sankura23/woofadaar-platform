import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  SafeAreaView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius, Typography, Shadows } from '../theme/colors';

interface ModalPickerProps {
  selectedValue: string;
  onValueChange: (value: string) => void;
  items: Array<{ label: string; value: string }>;
  placeholder?: string;
}

export default function ModalPicker({
  selectedValue,
  onValueChange,
  items,
  placeholder = 'Select an option',
}: ModalPickerProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;

  const selectedItem = items.find(item => item.value === selectedValue);

  useEffect(() => {
    if (modalVisible) {
      // Animate both fade and slide together
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset animations
      fadeAnim.setValue(0);
      slideAnim.setValue(300);
    }
  }, [modalVisible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setModalVisible(false);
    });
  };

  const handleSelect = (value: string) => {
    onValueChange(value);
    handleClose();
  };

  return (
    <>
      <TouchableOpacity
        style={styles.selector}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={[styles.selectorText, !selectedItem && styles.placeholderText]}>
          {selectedItem?.label || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color={Colors.ui.textSecondary} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="none"
        onRequestClose={handleClose}
      >
        <Animated.View
          style={[
            styles.modalOverlay,
            {
              opacity: fadeAnim,
            }
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={handleClose}
          />
          <Animated.View
            style={[
              styles.modalContent,
              {
                transform: [{ translateY: slideAnim }],
              }
            ]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Option</Text>
              <TouchableOpacity
                onPress={handleClose}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={Colors.ui.textSecondary} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={items}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    item.value === selectedValue && styles.selectedOption,
                  ]}
                  onPress={() => handleSelect(item.value)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      item.value === selectedValue && styles.selectedOptionText,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {item.value === selectedValue && (
                    <Ionicons name="checkmark" size={20} color={Colors.primary.mintTeal} />
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </Animated.View>
        </Animated.View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selector: {
    borderWidth: 1.5,
    borderColor: Colors.ui.border,
    borderRadius: BorderRadius.input,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.ui.surface,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectorText: {
    fontSize: Typography.fontSizes.body1,
    color: Colors.ui.textPrimary,
    flex: 1,
  },
  placeholderText: {
    color: Colors.ui.textTertiary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.ui.surface,
    borderTopLeftRadius: BorderRadius.card,
    borderTopRightRadius: BorderRadius.card,
    maxHeight: '70%',
    ...Shadows.card,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.ui.border,
  },
  modalTitle: {
    fontSize: Typography.fontSizes.h6,
    fontWeight: Typography.fontWeights.semiBold,
    color: Colors.ui.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  selectedOption: {
    backgroundColor: Colors.secondary.mintTeal[20],
  },
  optionText: {
    fontSize: Typography.fontSizes.body1,
    color: Colors.ui.textPrimary,
  },
  selectedOptionText: {
    color: Colors.primary.mintTeal,
    fontWeight: Typography.fontWeights.medium,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.ui.border,
    marginHorizontal: 20,
  },
});