import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { Platform, View, Text, Image } from 'react-native';
import { Colors, BorderRadius, Shadows } from '../theme/colors';

// Import screens
import DashboardScreen from '../screens/DashboardScreen';
import DogsScreen from '../screens/dogs/DogsScreen';
import AddDogScreen from '../screens/dogs/AddDogScreen';
import EditDogScreen from '../screens/dogs/EditDogScreen';
import DogIdScreen from '../screens/dog-id/DogIdScreen';
import HealthScreen from '../screens/health/HealthScreen';
import DailyLogScreen from '../screens/health/DailyLogScreen';
import HealthLogsScreen from '../screens/health/HealthLogsScreen';
import CommunityScreen from '../screens/community/CommunityScreen';
import QuestionDetailScreen from '../screens/community/QuestionDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import AppointmentsScreen from '../screens/AppointmentsScreen';

// Stack navigators for each tab
const HomeStack = createNativeStackNavigator();
const CommunityStack = createNativeStackNavigator();
const HealthStack = createNativeStackNavigator();
const DogsStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

// Home Stack
function HomeStackScreen() {
  return (
    <HomeStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.primary.mintTeal,
        },
        headerTintColor: Colors.neutral.milkWhite,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 20,
        },
      }}
    >
      <HomeStack.Screen
        name="DashboardHome"
        component={DashboardScreen}
        options={{
          title: 'Woofadaar',
          headerShown: false
        }}
      />
      <HomeStack.Screen
        name="Appointments"
        component={AppointmentsScreen}
        options={{
          title: 'Appointments',
          headerShown: false
        }}
      />
    </HomeStack.Navigator>
  );
}

// Community Stack
function CommunityStackScreen() {
  return (
    <CommunityStack.Navigator<CommunityStackParamList>
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.primary.mintTeal,
        },
        headerTintColor: Colors.neutral.milkWhite,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 20,
        },
      }}
    >
      <CommunityStack.Screen
        name="CommunityHome"
        component={CommunityScreen}
        options={{ headerShown: false }}
      />
      <CommunityStack.Screen
        name="QuestionDetail"
        component={QuestionDetailScreen}
        options={{ headerShown: false }}
      />
    </CommunityStack.Navigator>
  );
}

// Health Stack
function HealthStackScreen() {
  return (
    <HealthStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.primary.mintTeal,
        },
        headerTintColor: Colors.neutral.milkWhite,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 20,
        },
      }}
    >
      <HealthStack.Screen
        name="HealthHome"
        component={HealthScreen}
        options={{ headerShown: false }}
      />
      <HealthStack.Screen
        name="DailyLog"
        component={DailyLogScreen}
        options={{ title: 'Daily Health Log' }}
      />
      <HealthStack.Screen
        name="HealthLogs"
        component={HealthLogsScreen}
        options={{ headerShown: false }}
      />
    </HealthStack.Navigator>
  );
}

// Dogs Stack
function DogsStackScreen() {
  return (
    <DogsStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.primary.mintTeal,
        },
        headerTintColor: Colors.neutral.milkWhite,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 20,
        },
      }}
    >
      <DogsStack.Screen
        name="DogsList"
        component={DogsScreen}
        options={{ headerShown: false }}
      />
      <DogsStack.Screen
        name="AddDog"
        component={AddDogScreen}
        options={{ title: 'Add New Dog' }}
      />
      <DogsStack.Screen
        name="EditDog"
        component={EditDogScreen}
        options={{ headerShown: false }}
      />
      <DogsStack.Screen
        name="DogId"
        component={DogIdScreen as any}
        options={{ title: 'Dog Health ID' }}
      />
    </DogsStack.Navigator>
  );
}


// Profile Stack
function ProfileStackScreen() {
  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.primary.mintTeal,
        },
        headerTintColor: Colors.neutral.milkWhite,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 20,
        },
      }}
    >
      <ProfileStack.Screen
        name="ProfileHome"
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
      <ProfileStack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{
          title: 'Edit Profile',
          headerShown: false
        }}
      />
    </ProfileStack.Navigator>
  );
}

const Tab = createBottomTabNavigator();

export type CommunityStackParamList = {
  CommunityHome: undefined;
  QuestionDetail: {
    questionId: string;
    scrollToReplies?: boolean;
    question?: any;
  };
};

export type BottomTabParamList = {
  Home: undefined;
  Community: undefined;
  Health: undefined;
  MyDogs: undefined;
  Profile: undefined;
};

export default function BottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const iconSize = 24; // Consistent icon size

          if (route.name === 'Home') {
            return (
              <View style={{ alignItems: 'center' }}>
                <Image
                  source={require('../../assets/icons/home.png')}
                  style={{
                    width: iconSize,
                    height: iconSize,
                    tintColor: color,
                  }}
                />
              </View>
            );
          } else if (route.name === 'Community') {
            return (
              <View style={{ alignItems: 'center' }}>
                <Ionicons
                  name="chatbubbles"
                  size={iconSize}
                  color={color}
                />
              </View>
            );
          } else if (route.name === 'Health') {
            return (
              <View style={{ alignItems: 'center' }}>
                <Image
                  source={require('../../assets/icons/health.png')}
                  style={{
                    width: iconSize,
                    height: iconSize,
                    tintColor: color,
                  }}
                />
              </View>
            );
          } else if (route.name === 'MyDogs') {
            return (
              <View style={{ alignItems: 'center' }}>
                <Image
                  source={require('../../assets/icons/paw.png')}
                  style={{
                    width: iconSize,
                    height: iconSize,
                    tintColor: color,
                  }}
                />
              </View>
            );
          } else if (route.name === 'Profile') {
            return (
              <View style={{ alignItems: 'center' }}>
                <Image
                  source={require('../../assets/icons/profile.png')}
                  style={{
                    width: iconSize,
                    height: iconSize,
                    tintColor: color,
                  }}
                />
              </View>
            );
          }
        },
        tabBarActiveTintColor: Colors.primary.mintTeal,
        tabBarInactiveTintColor: Colors.neutral.darkGrey,
        tabBarStyle: {
          backgroundColor: Colors.ui.surface,
          borderTopWidth: 1,
          borderTopColor: Colors.ui.border,
          paddingBottom: Platform.OS === 'ios' ? 20 : 10,
          paddingTop: 10,
          height: Platform.OS === 'ios' ? 88 : 68,
          ...Shadows.small,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 4,
          letterSpacing: 0.2,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeStackScreen}
        options={{
          tabBarLabel: 'Home',
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            // Scroll to top when tab is pressed if already on this screen
            navigation.navigate('Home', {
              screen: 'DashboardHome',
              params: { scrollToTop: Date.now() }
            });
          },
        })}
      />
      <Tab.Screen
        name="Community"
        component={CommunityStackScreen}
        options={{
          tabBarLabel: 'Community',
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            navigation.navigate('Community', {
              screen: 'CommunityHome',
              params: { scrollToTop: Date.now() }
            });
          },
        })}
      />
      <Tab.Screen
        name="Health"
        component={HealthStackScreen}
        options={{
          tabBarLabel: 'Health',
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            navigation.navigate('Health', {
              screen: 'HealthHome',
              params: { scrollToTop: Date.now() }
            });
          },
        })}
      />
      <Tab.Screen
        name="MyDogs"
        component={DogsStackScreen}
        options={{
          tabBarLabel: 'My Dogs',
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            navigation.navigate('MyDogs', {
              screen: 'DogsList',
              params: { scrollToTop: Date.now() }
            });
          },
        })}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackScreen}
        options={{
          tabBarLabel: 'Profile',
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            navigation.navigate('Profile', {
              screen: 'ProfileHome',
              params: { scrollToTop: Date.now() }
            });
          },
        })}
      />
    </Tab.Navigator>
  );
}