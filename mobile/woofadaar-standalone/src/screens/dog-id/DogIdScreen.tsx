import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Dimensions,
  Share,
  Image,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { Colors, BorderRadius, Shadows, Spacing, Typography } from '../../theme/colors';

const { width } = Dimensions.get('window');

type DogIdScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'DogId'>;
  route: {
    params: {
      dogId: string;
      dogName: string;
    };
  };
};

export default function DogIdScreen({ navigation, route }: DogIdScreenProps) {
  const { dogId, dogName } = route.params;
  const [healthId, setHealthId] = useState<string>('');
  const [qrCodeData, setQrCodeData] = useState<string>('');

  useEffect(() => {
    generateHealthId();
  }, [dogId]);

  const generateHealthId = () => {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const generatedId = `WF-${dogId.slice(0, 4).toUpperCase()}-${timestamp.toString().slice(-6)}-${randomString.slice(0, 4).toUpperCase()}`;
    setHealthId(generatedId);

    const qrData = JSON.stringify({
      healthId: generatedId,
      dogName: dogName,
      platform: 'Woofadaar',
      timestamp: new Date().toISOString(),
      profileUrl: `https://woofadaar.com/dog/${dogId}`,
    });
    setQrCodeData(qrData);
  };

  const shareHealthId = async () => {
    try {
      await Share.share({
        message: `${dogName}'s Health ID: ${healthId}\n\nAccess their complete health profile at: https://woofadaar.com/dog/${dogId}`,
        title: `${dogName}'s Woofadaar Health ID`,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share Health ID');
    }
  };

  const copyToClipboard = () => {
    // Note: Clipboard functionality would require expo-clipboard
    Alert.alert('Copied!', `Health ID ${healthId} copied to clipboard`);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.ui.background} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Health ID Section */}
        <View style={styles.idSection}>
          <View style={styles.idCard}>
            <View style={styles.idHeader}>
              <View style={styles.woofadaarBrand}>
                <Text style={styles.brandText}>Woofadaar</Text>
                <Text style={styles.brandSubtext}>Digital Health ID</Text>
              </View>
              <View style={styles.activeBadge}>
                <Text style={styles.activeText}>ACTIVE</Text>
              </View>
            </View>

            <View style={styles.idDisplay}>
              <Text style={styles.idNumber}>{healthId}</Text>
              <TouchableOpacity style={styles.copyButton} onPress={copyToClipboard}>
                <Ionicons name="copy-outline" size={20} color={Colors.primary.mintTeal} />
              </TouchableOpacity>
            </View>
          </View>

          {/* QR Code */}
          <View style={styles.qrContainer}>
            <View style={styles.qrCodeBox}>
              <View style={styles.qrCodePlaceholder}>
                <Ionicons name="qr-code" size={80} color={Colors.ui.textTertiary} />
                <Text style={styles.qrText}>Scan for instant access</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity style={styles.primaryAction} onPress={shareHealthId}>
              <View style={styles.actionIcon}>
                <Ionicons name="share-outline" size={24} color={Colors.ui.surface} />
              </View>
              <Text style={styles.primaryActionText}>Share ID</Text>
              <Text style={styles.actionSubtext}>Send to vet</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryAction}
              onPress={() => navigation.navigate('Health', { dogId })}
            >
              <View style={styles.actionIconSecondary}>
                <Ionicons name="medical-outline" size={24} color={Colors.primary.mintTeal} />
              </View>
              <Text style={styles.secondaryActionText}>Health Records</Text>
              <Text style={styles.actionSubtext}>View history</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Emergency Access */}
        <View style={styles.emergencySection}>
          <View style={styles.emergencyCard}>
            <View style={styles.emergencyHeader}>
              <Ionicons name="medical" size={24} color={Colors.functional.error} />
              <Text style={styles.emergencyTitle}>Emergency Access</Text>
            </View>
            <Text style={styles.emergencyText}>
              Veterinarians can instantly access {dogName}'s complete medical history using this Health ID during emergencies.
            </Text>
            <View style={styles.emergencyFeatures}>
              <View style={styles.emergencyFeature}>
                <Ionicons name="shield-checkmark" size={16} color={Colors.functional.success} />
                <Text style={styles.emergencyFeatureText}>Secure & Private</Text>
              </View>
              <View style={styles.emergencyFeature}>
                <Ionicons name="flash" size={16} color={Colors.functional.warning} />
                <Text style={styles.emergencyFeatureText}>Instant Access</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Generate New ID */}
        <TouchableOpacity style={styles.regenerateSection} onPress={generateHealthId}>
          <Ionicons name="refresh-outline" size={20} color={Colors.ui.textSecondary} />
          <Text style={styles.regenerateText}>Generate New ID</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.ui.background,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  dogProfileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.ui.surface,
    borderRadius: BorderRadius.card,
    padding: Spacing.lg,
    ...Shadows.medium,
  },
  dogAvatarContainer: {
    position: 'relative',
    marginRight: Spacing.md,
  },
  dogAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.secondary.mintTeal[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  dogAvatarText: {
    fontSize: Typography.fontSizes.h4,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary.mintTeal,
  },
  statusIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: Colors.ui.surface,
    borderRadius: 12,
    padding: 2,
  },
  dogInfo: {
    flex: 1,
  },
  dogName: {
    fontSize: Typography.fontSizes.h5,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.ui.textPrimary,
    marginBottom: 2,
  },
  dogIdLabel: {
    fontSize: Typography.fontSizes.body2,
    color: Colors.ui.textSecondary,
    fontWeight: Typography.fontWeights.medium,
  },
  idSection: {
    paddingHorizontal: Spacing.mobile.margin,
    paddingTop: Spacing.lg,
    gap: Spacing.lg,
  },
  idCard: {
    backgroundColor: Colors.ui.surface,
    borderRadius: BorderRadius.card,
    padding: Spacing.lg,
    ...Shadows.small,
  },
  idHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  woofadaarBrand: {
    flex: 1,
  },
  brandText: {
    fontSize: Typography.fontSizes.h6,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary.mintTeal,
  },
  brandSubtext: {
    fontSize: Typography.fontSizes.caption,
    color: Colors.ui.textTertiary,
    marginTop: 2,
  },
  activeBadge: {
    backgroundColor: Colors.functional.success,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.buttonSmall,
  },
  activeText: {
    fontSize: Typography.fontSizes.caption,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.ui.surface,
    letterSpacing: 0.5,
  },
  idDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondary.mintTeal[20],
    borderRadius: BorderRadius.input,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.secondary.mintTeal[100],
  },
  idNumber: {
    flex: 1,
    fontSize: Typography.fontSizes.body1,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.ui.textPrimary,
    fontFamily: 'monospace',
  },
  copyButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.buttonSmall,
    backgroundColor: Colors.ui.surface,
  },
  qrContainer: {
    alignItems: 'center',
  },
  qrCodeBox: {
    backgroundColor: Colors.ui.surface,
    borderRadius: BorderRadius.card,
    padding: Spacing.lg,
    ...Shadows.small,
  },
  qrCodePlaceholder: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.ui.background,
    borderRadius: BorderRadius.input,
    borderWidth: 2,
    borderColor: Colors.ui.border,
    borderStyle: 'dashed',
  },
  qrText: {
    fontSize: Typography.fontSizes.caption,
    color: Colors.ui.textTertiary,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  actionsSection: {
    paddingHorizontal: Spacing.mobile.margin,
    paddingTop: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.h6,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.ui.textPrimary,
    marginBottom: Spacing.md,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  primaryAction: {
    flex: 1,
    backgroundColor: Colors.primary.mintTeal,
    borderRadius: BorderRadius.card,
    padding: Spacing.lg,
    alignItems: 'center',
    ...Shadows.small,
  },
  secondaryAction: {
    flex: 1,
    backgroundColor: Colors.ui.surface,
    borderRadius: BorderRadius.card,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary.mintTeal,
    ...Shadows.small,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  actionIconSecondary: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary.mintTeal[20],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  primaryActionText: {
    fontSize: Typography.fontSizes.body1,
    fontWeight: Typography.fontWeights.semiBold,
    color: Colors.ui.surface,
    marginBottom: 2,
  },
  secondaryActionText: {
    fontSize: Typography.fontSizes.body1,
    fontWeight: Typography.fontWeights.semiBold,
    color: Colors.primary.mintTeal,
    marginBottom: 2,
  },
  actionSubtext: {
    fontSize: Typography.fontSizes.caption,
    color: Colors.ui.textTertiary,
  },
  emergencySection: {
    paddingHorizontal: Spacing.mobile.margin,
    paddingTop: Spacing.xl,
  },
  emergencyCard: {
    backgroundColor: Colors.functional.error + '10',
    borderRadius: BorderRadius.card,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.functional.error + '30',
  },
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  emergencyTitle: {
    fontSize: Typography.fontSizes.body1,
    fontWeight: Typography.fontWeights.semiBold,
    color: Colors.functional.error,
  },
  emergencyText: {
    fontSize: Typography.fontSizes.body2,
    color: Colors.ui.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  emergencyFeatures: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  emergencyFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  emergencyFeatureText: {
    fontSize: Typography.fontSizes.caption,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.ui.textSecondary,
  },
  regenerateSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.mobile.margin,
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  regenerateText: {
    fontSize: Typography.fontSizes.body2,
    color: Colors.ui.textSecondary,
    fontWeight: Typography.fontWeights.medium,
  },
});