// Mock data for events system demonstration
export const mockEvents = [
  {
    id: 'event-1',
    title: 'Mumbai Dog Park Meetup',
    description: 'Join fellow dog parents for a fun-filled afternoon at Oval Maidan! Bring your furry friends for socializing, games, and treats. Perfect opportunity to connect with the local dog community.',
    event_type: 'meetup',
    category: 'social',
    status: 'published',
    is_virtual: false,
    is_premium_only: false,
    is_featured: true,
    start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // 3 hours later
    venue_name: 'Oval Maidan',
    address: 'Oval Maidan, Churchgate, Mumbai',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    cover_image_url: null,
    is_free: true,
    price: null,
    currency: 'INR',
    max_participants: 50,
    current_participants: 15,
    allow_guests: true,
    max_guests_per_user: 2,
    waiting_list_enabled: true,
    requirements: ['Bring your dog', 'Vaccination certificate', 'Water bowl'],
    tags: ['social', 'outdoor', 'meetup'],
    organizer_id: 'organizer-1',
    organizer: {
      id: 'organizer-1',
      name: 'Priya Sharma',
      profile_image_url: null,
      location: 'Mumbai, Maharashtra'
    },
    created_at: new Date('2025-09-01'),
    confirmed_attendees_count: 15,
    waiting_list_count: 3,
    comments_count: 5,
    photos_count: 0,
    is_full: false,
    spots_remaining: 35,
    registration_open: true
  },
  {
    id: 'event-2',
    title: 'Online Dog Training Workshop',
    description: 'Learn essential dog training techniques from certified trainers. This virtual workshop covers basic commands, house training, and behavioral corrections. Perfect for new dog parents!',
    event_type: 'webinar',
    category: 'educational',
    status: 'published',
    is_virtual: true,
    is_premium_only: true,
    is_featured: false,
    start_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    end_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 2 hours later
    venue_name: null,
    address: null,
    city: 'Online',
    state: 'Online',
    country: 'India',
    virtual_link: 'https://zoom.us/j/123456789',
    cover_image_url: null,
    is_free: false,
    price: 49900, // ₹499 in paisa
    currency: 'INR',
    max_participants: 100,
    current_participants: 67,
    allow_guests: false,
    max_guests_per_user: 0,
    waiting_list_enabled: true,
    requirements: ['Stable internet connection', 'Notebook for taking notes'],
    tags: ['training', 'online', 'educational'],
    organizer_id: 'organizer-2',
    organizer: {
      id: 'organizer-2',
      name: 'Dr. Rajesh Kumar',
      profile_image_url: null,
      location: 'Delhi, India'
    },
    created_at: new Date('2025-08-25'),
    confirmed_attendees_count: 67,
    waiting_list_count: 8,
    comments_count: 12,
    photos_count: 0,
    is_full: false,
    spots_remaining: 33,
    registration_open: true
  },
  {
    id: 'event-3',
    title: 'Bangalore Dog Health Camp',
    description: 'Free health checkup camp for dogs with experienced veterinarians. Basic health screening, vaccination guidance, and nutrition counseling. Open to all dog parents in Bangalore.',
    event_type: 'health_camp',
    category: 'health',
    status: 'published',
    is_virtual: false,
    is_premium_only: false,
    is_featured: true,
    start_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
    end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000), // 4 hours later
    venue_name: 'Cubbon Park Community Center',
    address: 'Cubbon Park, MG Road, Bangalore',
    city: 'Bangalore',
    state: 'Karnataka',
    country: 'India',
    cover_image_url: null,
    is_free: true,
    price: null,
    currency: 'INR',
    max_participants: 30,
    current_participants: 28,
    allow_guests: true,
    max_guests_per_user: 1,
    waiting_list_enabled: true,
    requirements: ['Bring your dog', 'Previous medical records', 'Dog leash'],
    tags: ['health', 'veterinary', 'free'],
    organizer_id: 'organizer-3',
    organizer: {
      id: 'organizer-3',
      name: 'Dr. Meera Reddy',
      profile_image_url: null,
      location: 'Bangalore, Karnataka'
    },
    created_at: new Date('2025-08-30'),
    confirmed_attendees_count: 28,
    waiting_list_count: 12,
    comments_count: 8,
    photos_count: 0,
    is_full: false,
    spots_remaining: 2,
    registration_open: true
  },
  {
    id: 'event-4',
    title: 'Delhi Dog Show Competition',
    description: 'Annual dog show competition with multiple categories including Best in Show, Most Obedient, and Best Dressed. Prizes and certificates for winners. Registration required.',
    event_type: 'competition',
    category: 'competition',
    status: 'published',
    is_virtual: false,
    is_premium_only: false,
    is_featured: false,
    start_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 3 weeks from now
    end_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000), // 6 hours later
    venue_name: 'India Gate Lawns',
    address: 'India Gate, New Delhi',
    city: 'Delhi',
    state: 'Delhi',
    country: 'India',
    cover_image_url: null,
    is_free: false,
    price: 25000, // ₹250 in paisa
    currency: 'INR',
    max_participants: 75,
    current_participants: 45,
    allow_guests: true,
    max_guests_per_user: 3,
    waiting_list_enabled: true,
    requirements: ['Dog registration papers', 'Vaccination certificate', 'Competition entry form'],
    tags: ['competition', 'show', 'prizes'],
    organizer_id: 'organizer-4',
    organizer: {
      id: 'organizer-4',
      name: 'Delhi Dog Show Society',
      profile_image_url: null,
      location: 'New Delhi, Delhi'
    },
    created_at: new Date('2025-09-05'),
    confirmed_attendees_count: 45,
    waiting_list_count: 0,
    comments_count: 15,
    photos_count: 0,
    is_full: false,
    spots_remaining: 30,
    registration_open: true
  },
  {
    id: 'event-5',
    title: 'Chennai Diwali Dog Festival',
    description: 'Celebrate Diwali with your furry friends! Special decorations, traditional music, dog-friendly sweets, and costume competition. A cultural celebration for the entire dog community.',
    event_type: 'meetup',
    category: 'festival',
    status: 'published',
    is_virtual: false,
    is_premium_only: false,
    is_featured: true,
    start_date: new Date('2025-10-30T16:00:00.000Z'), // Diwali 2025
    end_date: new Date('2025-10-30T20:00:00.000Z'), // 4 hours later
    venue_name: 'Marina Beach Community Ground',
    address: 'Marina Beach Road, Chennai',
    city: 'Chennai',
    state: 'Tamil Nadu',
    country: 'India',
    cover_image_url: null,
    is_free: true,
    price: null,
    currency: 'INR',
    max_participants: 200,
    current_participants: 89,
    allow_guests: true,
    max_guests_per_user: 4,
    waiting_list_enabled: true,
    requirements: ['Bring your dog in costume', 'Dog treats to share', 'Diwali spirit!'],
    tags: ['festival', 'diwali', 'cultural', 'costumes'],
    organizer_id: 'organizer-5',
    organizer: {
      id: 'organizer-5',
      name: 'Chennai Dog Parents Community',
      profile_image_url: null,
      location: 'Chennai, Tamil Nadu'
    },
    created_at: new Date('2025-09-08'),
    confirmed_attendees_count: 89,
    waiting_list_count: 5,
    comments_count: 23,
    photos_count: 0,
    is_full: false,
    spots_remaining: 111,
    registration_open: true
  }
];

export const mockUsers = [
  {
    id: 'demo-user-id',
    name: 'Demo User',
    email: 'demo@woofadaar.com',
    profile_image_url: null
  },
  {
    id: 'organizer-1',
    name: 'Priya Sharma',
    email: 'priya@woofadaar.com',
    profile_image_url: null
  }
];

export const mockRsvps = [
  {
    id: 'rsvp-1',
    event_id: 'event-2', // User is attending the online training
    user_id: 'demo-user-id',
    status: 'confirmed',
    guest_count: 0,
    guest_names: [],
    special_requirements: null,
    created_at: new Date('2025-09-08')
  }
];

export const mockWaitingList = [
  {
    id: 'wait-1',
    event_id: 'event-3', // User is waiting for health camp
    user_id: 'demo-user-id',
    position: 3,
    status: 'waiting',
    joined_at: new Date('2025-09-09')
  }
];