import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
  TextInput,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { apiService } from '../services/api';
import { Colors, BorderRadius, Shadows, Spacing, Typography } from '../theme/colors';

const { width } = Dimensions.get('window');

type AppointmentsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Appointments'>;
};

interface Partner {
  id: string;
  name: string;
  business_name: string | null;
  partner_type: string;
  location: string;
  consultation_fee: string | null;
}

interface Appointment {
  id: string;
  partner_id: string;
  partner_name: string;
  appointment_date: string;
  appointment_time: string;
  meeting_type: string;
  consultation_fee: number;
  status: string;
  notes: string | null;
  service_type: string;
  created_at: string;
}

const SERVICE_TYPES = [
  { value: 'consultation', label: 'Consultation', icon: 'medical', color: Colors.primary.mintTeal, description: 'General health checkup' },
  { value: 'treatment', label: 'Treatment', icon: 'fitness', color: Colors.primary.burntOrange, description: 'Medical treatment' },
  { value: 'training', label: 'Training', icon: 'school', color: Colors.primary.mutedPurple, description: 'Behavioral training' },
  { value: 'emergency', label: 'Emergency', icon: 'warning', color: Colors.functional.error, description: 'Urgent care needed' },
];

const MEETING_TYPES = [
  { value: 'in_person', label: 'In-Person', icon: 'medical', color: Colors.primary.mintTeal, description: 'Visit clinic' },
  { value: 'video_call', label: 'Video Call', icon: 'videocam', color: Colors.primary.burntOrange, description: 'Online consultation' },
  { value: 'phone_call', label: 'Phone Call', icon: 'call', color: Colors.primary.mutedPurple, description: 'Phone consultation' },
];

export default function AppointmentsScreen({ navigation }: AppointmentsScreenProps) {
  const [activeTab, setActiveTab] = useState<'book' | 'history'>('book');
  const [partners, setPartners] = useState<Partner[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  // Booking form state
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [meetingType, setMeetingType] = useState('in_person');
  const [serviceType, setServiceType] = useState('consultation');
  const [notes, setNotes] = useState('');

  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  useEffect(() => {
    if (activeTab === 'book') {
      fetchPartners();
    } else {
      fetchAppointments();
    }
  }, [activeTab]);

  const fetchPartners = async () => {
    setLoading(true);
    try {
      const data = await apiService.getPartners();
      setPartners(data.partners || []);
    } catch (error) {
      console.error('Error fetching partners:', error);
      setPartners([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const response = await apiService.getAppointments();
      setAppointments(response.data?.appointments || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = async () => {
    if (!selectedPartner || !appointmentDate || !appointmentTime || !serviceType) {
      Alert.alert('Error', 'Please complete all required fields');
      return;
    }

    setBookingLoading(true);
    try {
      const appointmentDateTime = `${appointmentDate}T${appointmentTime}:00.000Z`;

      const bookingData = {
        partner_id: selectedPartner.id,
        appointment_date: appointmentDateTime,
        service_type: serviceType,
        meeting_type: meetingType,
        notes: notes.trim() || undefined,
      };

      const result = await apiService.bookAppointment(bookingData);

      if (result.success) {
        Alert.alert(
          '🎉 Appointment Booked!',
          'Your appointment has been successfully scheduled. You will receive a confirmation shortly.',
          [
            {
              text: 'View Appointments',
              onPress: () => {
                resetForm();
                setActiveTab('history');
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', result.message || 'Failed to book appointment');
      }
    } catch (error) {
      console.error('Booking error:', error);
      Alert.alert('Error', 'Failed to book appointment. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedPartner(null);
    setAppointmentDate('');
    setAppointmentTime('');
    setMeetingType('in_person');
    setServiceType('consultation');
    setNotes('');
    setCurrentStep(1);
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceedFromStep = (step: number) => {
    switch (step) {
      case 1: return !!selectedPartner;
      case 2: return !!serviceType;
      case 3: return !!appointmentDate && !!appointmentTime;
      case 4: return true;
      default: return false;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'scheduled':
        return Colors.functional.success;
      case 'pending':
        return Colors.functional.warning;
      case 'cancelled':
        return Colors.functional.error;
      default:
        return Colors.ui.textTertiary;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return timeString.slice(0, 5);
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {Array.from({ length: totalSteps }, (_, index) => (
        <View key={index} style={styles.stepContainer}>
          <View style={[
            styles.stepCircle,
            {
              backgroundColor: index + 1 <= currentStep ? Colors.primary.mintTeal : Colors.ui.border,
            }
          ]}>
            {index + 1 < currentStep ? (
              <Ionicons name="checkmark" size={16} color={Colors.ui.surface} />
            ) : (
              <Text style={[
                styles.stepNumber,
                { color: index + 1 <= currentStep ? Colors.ui.surface : Colors.ui.textTertiary }
              ]}>
                {index + 1}
              </Text>
            )}
          </View>
          {index < totalSteps - 1 && (
            <View style={[
              styles.stepLine,
              { backgroundColor: index + 1 < currentStep ? Colors.primary.mintTeal : Colors.ui.border }
            ]} />
          )}
        </View>
      ))}
    </View>
  );

  const renderPartnerSelection = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Choose Veterinarian</Text>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary.mintTeal} />
          <Text style={styles.loadingText}>Finding available partners...</Text>
        </View>
      ) : partners.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="stethoscope" size={64} color={Colors.ui.textTertiary} />
          <Text style={styles.emptyTitle}>No Partners Available</Text>
          <Text style={styles.emptySubtitle}>Please check back later</Text>
        </View>
      ) : (
        <ScrollView style={styles.partnersContainer} showsVerticalScrollIndicator={false}>
          {partners.map((partner) => (
            <TouchableOpacity
              key={partner.id}
              style={[
                styles.partnerCard,
                selectedPartner?.id === partner.id && styles.partnerCardSelected
              ]}
              onPress={() => setSelectedPartner(partner)}
            >
              <View style={[
                styles.partnerAvatar,
                selectedPartner?.id === partner.id && { backgroundColor: Colors.primary.mintTeal }
              ]}>
                {selectedPartner?.id === partner.id ? (
                  <Ionicons
                    name="checkmark"
                    size={22}
                    color={Colors.ui.surface}
                  />
                ) : (
                  <MaterialCommunityIcons
                    name="stethoscope"
                    size={22}
                    color={Colors.primary.mintTeal}
                  />
                )}
              </View>
              <View style={styles.partnerInfo}>
                <Text style={styles.partnerName}>
                  {partner.business_name || `Dr. ${partner.name}`}
                </Text>
                <Text style={styles.partnerType}>
                  {partner.partner_type.charAt(0).toUpperCase() + partner.partner_type.slice(1)}
                </Text>
                <Text style={styles.partnerLocation}>📍 {partner.location}</Text>
                {partner.consultation_fee && (
                  <Text style={styles.partnerFee}>From ₹{partner.consultation_fee}</Text>
                )}
              </View>
              {selectedPartner?.id === partner.id && (
                <Ionicons name="checkmark-circle" size={24} color={Colors.primary.mintTeal} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );

  const renderServiceSelection = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>What do you need?</Text>
      <Text style={styles.stepSubtitle}>Choose the type of service</Text>

      <View style={styles.optionsGrid}>
        {SERVICE_TYPES.map((service) => (
          <TouchableOpacity
            key={service.value}
            style={[
              styles.serviceCard,
              serviceType === service.value && [styles.serviceCardSelected, { borderColor: service.color }]
            ]}
            onPress={() => setServiceType(service.value)}
          >
            <View style={[styles.serviceIcon, { backgroundColor: `${service.color}20` }]}>
              <Ionicons name={service.icon as any} size={24} color={service.color} />
            </View>
            <Text style={[
              styles.serviceLabel,
              serviceType === service.value && { color: service.color }
            ]}>
              {service.label}
            </Text>
            <Text style={styles.serviceDescription}>{service.description}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.meetingTypeSection}>
        <Text style={styles.sectionLabel}>How would you like to meet?</Text>
        <View style={styles.meetingTypeGrid}>
          {MEETING_TYPES.map((meeting) => (
            <TouchableOpacity
              key={meeting.value}
              style={[
                styles.meetingTypeCard,
                meetingType === meeting.value && [styles.meetingTypeCardSelected, { borderColor: meeting.color }]
              ]}
              onPress={() => setMeetingType(meeting.value)}
            >
              <Ionicons name={meeting.icon as any} size={20} color={meeting.color} />
              <Text style={[
                styles.meetingTypeLabel,
                meetingType === meeting.value && { color: meeting.color }
              ]}>
                {meeting.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderDateTimeSelection = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>When works for you?</Text>
      <Text style={styles.stepSubtitle}>Pick your preferred date and time</Text>

      <View style={styles.dateTimeContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Date *</Text>
          <TouchableOpacity
            style={styles.dateTimeInput}
            onPress={() => Alert.alert('Date Picker', 'Please enter date in YYYY-MM-DD format for now')}
          >
            <Ionicons name="calendar" size={20} color={Colors.primary.mintTeal} />
            <TextInput
              style={styles.dateTimeInputText}
              value={appointmentDate}
              onChangeText={setAppointmentDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.ui.textTertiary}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Time *</Text>
          <TouchableOpacity
            style={styles.dateTimeInput}
            onPress={() => Alert.alert('Time Picker', 'Please enter time in HH:MM format for now')}
          >
            <Ionicons name="time" size={20} color={Colors.primary.mintTeal} />
            <TextInput
              style={styles.dateTimeInputText}
              value={appointmentTime}
              onChangeText={setAppointmentTime}
              placeholder="HH:MM"
              placeholderTextColor={Colors.ui.textTertiary}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.notesSection}>
        <Text style={styles.inputLabel}>Additional Notes (Optional)</Text>
        <TextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder="Any specific concerns or questions you'd like to discuss..."
          placeholderTextColor={Colors.ui.textTertiary}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>
    </View>
  );

  const renderConfirmation = () => {
    const selectedService = SERVICE_TYPES.find(s => s.value === serviceType);
    const selectedMeeting = MEETING_TYPES.find(m => m.value === meetingType);

    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>Confirm Your Appointment</Text>
        <Text style={styles.stepSubtitle}>Please review the details below</Text>

        <View style={styles.confirmationCard}>
          <View style={styles.confirmationSection}>
            <Text style={styles.confirmationLabel}>Veterinarian</Text>
            <Text style={styles.confirmationValue}>{selectedPartner?.business_name || `Dr. ${selectedPartner?.name}`}</Text>
            <Text style={styles.confirmationSubValue}>📍 {selectedPartner?.location}</Text>
          </View>

          <View style={styles.confirmationDivider} />

          <View style={styles.confirmationSection}>
            <Text style={styles.confirmationLabel}>Service & Meeting</Text>
            <Text style={styles.confirmationValue}>{selectedService?.label}</Text>
            <Text style={styles.confirmationSubValue}>🎥 {selectedMeeting?.label}</Text>
          </View>

          <View style={styles.confirmationDivider} />

          <View style={styles.confirmationSection}>
            <Text style={styles.confirmationLabel}>Date & Time</Text>
            <Text style={styles.confirmationValue}>{formatDate(appointmentDate)}</Text>
            <Text style={styles.confirmationSubValue}>🕐 {formatTime(appointmentTime)}</Text>
          </View>

          {notes && (
            <>
              <View style={styles.confirmationDivider} />
              <View style={styles.confirmationSection}>
                <Text style={styles.confirmationLabel}>Notes</Text>
                <Text style={styles.confirmationValue}>{notes}</Text>
              </View>
            </>
          )}
        </View>
      </View>
    );
  };

  const renderAppointmentHistory = () => (
    <View style={styles.historyContainer}>
      <Text style={styles.historyTitle}>Your Appointments</Text>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary.mintTeal} />
          <Text style={styles.loadingText}>Loading appointments...</Text>
        </View>
      ) : appointments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={64} color={Colors.ui.textTertiary} />
          <Text style={styles.emptyTitle}>No Appointments Yet</Text>
          <Text style={styles.emptySubtitle}>Book your first appointment to get started!</Text>
          <TouchableOpacity
            style={styles.bookFirstButton}
            onPress={() => setActiveTab('book')}
          >
            <Text style={styles.bookFirstButtonText}>Book First Appointment</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.appointmentsList} showsVerticalScrollIndicator={false}>
          {appointments.map((appointment) => (
            <View key={appointment.id} style={styles.appointmentCard}>
              <View style={styles.appointmentHeader}>
                <View style={styles.appointmentMainInfo}>
                  <Text style={styles.appointmentPartner}>{appointment.partner_name}</Text>
                  <Text style={styles.appointmentDateTime}>
                    {formatDate(appointment.appointment_date)} at {appointment.appointment_time}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(appointment.status)}20` }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(appointment.status) }]}>
                    {appointment.status}
                  </Text>
                </View>
              </View>

              <View style={styles.appointmentDetails}>
                <View style={styles.appointmentMeta}>
                  <Ionicons name="medical" size={16} color={Colors.ui.textTertiary} />
                  <Text style={styles.appointmentMetaText}>{appointment.service_type}</Text>
                </View>
                <Text style={styles.appointmentFee}>₹{appointment.consultation_fee}</Text>
              </View>

              {appointment.notes && (
                <View style={styles.appointmentNotes}>
                  <Text style={styles.appointmentNotesText}>"{appointment.notes}"</Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Page Title */}
        <View style={styles.titleSection}>
          <Text style={styles.pageTitle}>Appointments</Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'book' && styles.activeTab]}
            onPress={() => {
              setActiveTab('book');
              resetForm();
            }}
          >
            <Ionicons
              name="add-circle"
              size={20}
              color={activeTab === 'book' ? Colors.primary.mintTeal : Colors.ui.textTertiary}
            />
            <Text style={[styles.tabText, activeTab === 'book' && styles.activeTabText]}>
              Book New
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'history' && styles.activeTab]}
            onPress={() => setActiveTab('history')}
          >
            <Ionicons
              name="time"
              size={20}
              color={activeTab === 'history' ? Colors.primary.mintTeal : Colors.ui.textTertiary}
            />
            <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
              My Appointments
            </Text>
          </TouchableOpacity>
        </View>
        {activeTab === 'book' ? (
          <View style={styles.bookingContainer}>
            {renderStepIndicator()}

            {currentStep === 1 && renderPartnerSelection()}
            {currentStep === 2 && renderServiceSelection()}
            {currentStep === 3 && renderDateTimeSelection()}
            {currentStep === 4 && renderConfirmation()}

            {/* Navigation Buttons */}
            <View style={styles.navigationButtons}>
              {currentStep > 1 && (
                <TouchableOpacity style={styles.backStepButton} onPress={prevStep}>
                  <Ionicons name="chevron-back" size={20} color={Colors.ui.textPrimary} />
                  <Text style={styles.backStepText}>Back</Text>
                </TouchableOpacity>
              )}

              <View style={styles.spacer} />

              {currentStep < totalSteps ? (
                <TouchableOpacity
                  style={[
                    styles.nextStepButton,
                    !canProceedFromStep(currentStep) && styles.nextStepButtonDisabled
                  ]}
                  onPress={nextStep}
                  disabled={!canProceedFromStep(currentStep)}
                >
                  <Text style={styles.nextStepText}>Next</Text>
                  <Ionicons name="chevron-forward" size={20} color={Colors.ui.surface} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.bookButton, bookingLoading && styles.bookButtonDisabled]}
                  onPress={handleBooking}
                  disabled={bookingLoading}
                >
                  {bookingLoading ? (
                    <ActivityIndicator size="small" color={Colors.ui.surface} />
                  ) : (
                    <>
                      <Text style={styles.bookButtonText}>Book Appointment</Text>
                      <Ionicons name="checkmark" size={20} color={Colors.ui.surface} />
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : (
          renderAppointmentHistory()
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral.fafafa,
  },
  scrollContainer: {
    paddingBottom: 100,
  },
  titleSection: {
    paddingHorizontal: Spacing.mobile.margin,
    paddingTop: 20,
    paddingBottom: 24,
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: Colors.primary.mutedPurple,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.secondary.mintTeal[10],
    marginHorizontal: Spacing.mobile.margin,
    marginTop: Spacing.sm,
    borderRadius: 25,
    padding: 3,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: Spacing.sm,
    borderRadius: 22,
    gap: Spacing.xs,
  },
  activeTab: {
    backgroundColor: Colors.ui.surface,
    ...Shadows.small,
  },
  tabText: {
    fontSize: Typography.fontSizes.body1,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.ui.textTertiary,
  },
  activeTabText: {
    color: Colors.primary.mintTeal,
    fontWeight: Typography.fontWeights.semiBold,
  },
  bookingContainer: {
    padding: Spacing.mobile.margin,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    fontSize: Typography.fontSizes.body2,
    fontWeight: Typography.fontWeights.bold,
  },
  stepLine: {
    width: (width - Spacing.mobile.margin * 2 - Spacing.lg * 2 - 32 * 4) / 3,
    height: 2,
    marginHorizontal: Spacing.sm,
  },
  stepContent: {
    marginBottom: Spacing.md,
  },
  stepTitle: {
    fontSize: Typography.fontSizes.h5,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.ui.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  stepSubtitle: {
    fontSize: Typography.fontSizes.body2,
    color: Colors.ui.textTertiary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl * 2,
  },
  loadingText: {
    fontSize: Typography.fontSizes.body2,
    color: Colors.ui.textTertiary,
    marginTop: Spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl * 2,
  },
  emptyTitle: {
    fontSize: Typography.fontSizes.h6,
    fontWeight: Typography.fontWeights.semiBold,
    color: Colors.ui.textPrimary,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: Typography.fontSizes.body2,
    color: Colors.ui.textTertiary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  partnersContainer: {
    maxHeight: 400,
  },
  partnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.ui.surface,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.ui.border,
    ...Shadows.small,
  },
  partnerCardSelected: {
    borderColor: Colors.primary.mintTeal,
    backgroundColor: Colors.secondary.mintTeal[5],
    transform: [{ scale: 0.98 }],
    ...Shadows.medium,
  },
  partnerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary.mintTeal + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  partnerInfo: {
    flex: 1,
  },
  partnerName: {
    fontSize: Typography.fontSizes.h6,
    fontWeight: Typography.fontWeights.semiBold,
    color: Colors.ui.textPrimary,
    marginBottom: 3,
  },
  partnerType: {
    fontSize: Typography.fontSizes.body2,
    color: Colors.primary.mintTeal,
    fontWeight: Typography.fontWeights.medium,
    marginBottom: 1,
  },
  partnerLocation: {
    fontSize: Typography.fontSizes.body2,
    color: Colors.ui.textSecondary,
    marginBottom: 1,
  },
  partnerFee: {
    fontSize: Typography.fontSizes.caption,
    color: Colors.primary.burntOrange,
    fontWeight: Typography.fontWeights.semiBold,
  },
  optionsGrid: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  serviceCard: {
    backgroundColor: Colors.ui.surface,
    borderRadius: BorderRadius.card,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    ...Shadows.small,
  },
  serviceCardSelected: {
    borderWidth: 2,
    backgroundColor: Colors.ui.surface,
  },
  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  serviceLabel: {
    fontSize: Typography.fontSizes.body1,
    fontWeight: Typography.fontWeights.semiBold,
    color: Colors.ui.textPrimary,
    marginBottom: Spacing.xs,
  },
  serviceDescription: {
    fontSize: Typography.fontSizes.caption,
    color: Colors.ui.textTertiary,
    textAlign: 'center',
  },
  meetingTypeSection: {
    marginTop: Spacing.lg,
  },
  sectionLabel: {
    fontSize: Typography.fontSizes.body1,
    fontWeight: Typography.fontWeights.semiBold,
    color: Colors.ui.textPrimary,
    marginBottom: Spacing.md,
  },
  meetingTypeGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  meetingTypeCard: {
    flex: 1,
    backgroundColor: Colors.ui.surface,
    borderRadius: BorderRadius.input,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    ...Shadows.small,
  },
  meetingTypeCardSelected: {
    borderWidth: 2,
  },
  meetingTypeLabel: {
    fontSize: Typography.fontSizes.caption,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.ui.textPrimary,
    marginTop: Spacing.xs,
  },
  dateTimeContainer: {
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  inputGroup: {
    gap: Spacing.sm,
  },
  inputLabel: {
    fontSize: Typography.fontSizes.body1,
    fontWeight: Typography.fontWeights.semiBold,
    color: Colors.ui.textPrimary,
  },
  dateTimeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.ui.surface,
    borderRadius: BorderRadius.input,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.ui.border,
    gap: Spacing.sm,
    ...Shadows.small,
  },
  dateTimeInputText: {
    flex: 1,
    fontSize: Typography.fontSizes.body1,
    color: Colors.ui.textPrimary,
  },
  notesSection: {
    gap: Spacing.sm,
  },
  notesInput: {
    backgroundColor: Colors.ui.surface,
    borderRadius: BorderRadius.input,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.ui.border,
    fontSize: Typography.fontSizes.body1,
    color: Colors.ui.textPrimary,
    height: 100,
    ...Shadows.small,
  },
  confirmationCard: {
    backgroundColor: Colors.ui.surface,
    borderRadius: BorderRadius.card,
    padding: Spacing.lg,
    ...Shadows.medium,
  },
  confirmationSection: {
    marginVertical: Spacing.sm,
  },
  confirmationLabel: {
    fontSize: Typography.fontSizes.caption,
    color: Colors.ui.textTertiary,
    fontWeight: Typography.fontWeights.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  confirmationValue: {
    fontSize: Typography.fontSizes.body1,
    fontWeight: Typography.fontWeights.semiBold,
    color: Colors.ui.textPrimary,
    marginBottom: 2,
  },
  confirmationSubValue: {
    fontSize: Typography.fontSizes.body2,
    color: Colors.ui.textSecondary,
  },
  confirmationDivider: {
    height: 1,
    backgroundColor: Colors.ui.divider,
    marginVertical: Spacing.sm,
  },
  navigationButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: Spacing.md,
  },
  backStepButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xs,
  },
  backStepText: {
    fontSize: Typography.fontSizes.body1,
    color: Colors.ui.textPrimary,
    fontWeight: Typography.fontWeights.medium,
  },
  spacer: {
    flex: 1,
  },
  nextStepButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary.mintTeal,
    borderRadius: BorderRadius.button,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xs,
    ...Shadows.small,
  },
  nextStepButtonDisabled: {
    opacity: 0.6,
  },
  nextStepText: {
    fontSize: Typography.fontSizes.body1,
    fontWeight: Typography.fontWeights.semiBold,
    color: Colors.ui.surface,
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary.mintTeal,
    borderRadius: BorderRadius.button,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xs,
    ...Shadows.medium,
  },
  bookButtonDisabled: {
    opacity: 0.6,
  },
  bookButtonText: {
    fontSize: Typography.fontSizes.body1,
    fontWeight: Typography.fontWeights.semiBold,
    color: Colors.ui.surface,
  },
  historyContainer: {
    padding: Spacing.mobile.margin,
  },
  historyTitle: {
    fontSize: Typography.fontSizes.h6,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.ui.textPrimary,
    marginBottom: Spacing.lg,
  },
  bookFirstButton: {
    backgroundColor: Colors.primary.mintTeal,
    borderRadius: BorderRadius.button,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    ...Shadows.small,
  },
  bookFirstButtonText: {
    fontSize: Typography.fontSizes.body1,
    fontWeight: Typography.fontWeights.semiBold,
    color: Colors.ui.surface,
  },
  appointmentsList: {
    gap: Spacing.md,
  },
  appointmentCard: {
    backgroundColor: Colors.ui.surface,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary.mintTeal,
    ...Shadows.small,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  appointmentMainInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  appointmentPartner: {
    fontSize: Typography.fontSizes.body1,
    fontWeight: Typography.fontWeights.semiBold,
    color: Colors.ui.textPrimary,
    marginBottom: 2,
  },
  appointmentDateTime: {
    fontSize: Typography.fontSizes.body2,
    color: Colors.ui.textTertiary,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.buttonSmall,
  },
  statusText: {
    fontSize: Typography.fontSizes.caption,
    fontWeight: Typography.fontWeights.semiBold,
    textTransform: 'capitalize',
  },
  appointmentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  appointmentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  appointmentMetaText: {
    fontSize: Typography.fontSizes.body2,
    color: Colors.ui.textTertiary,
    textTransform: 'capitalize',
  },
  appointmentFee: {
    fontSize: Typography.fontSizes.body1,
    fontWeight: Typography.fontWeights.semiBold,
    color: Colors.primary.mintTeal,
  },
  appointmentNotes: {
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.ui.divider,
  },
  appointmentNotesText: {
    fontSize: Typography.fontSizes.body2,
    color: Colors.ui.textSecondary,
    fontStyle: 'italic',
  },
});