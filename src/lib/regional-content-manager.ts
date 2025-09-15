// Week 24 Phase 3: Regional Content and Cultural Customization System
// Handles regional preferences, cultural festivals, and localized content for different Indian states

import prisma from './db';

export interface RegionalProfile {
  state: string;
  region: 'north' | 'south' | 'east' | 'west' | 'central' | 'northeast';
  primaryLanguages: string[];
  culturalFestivals: CulturalFestival[];
  climateType: 'tropical' | 'subtropical' | 'temperate' | 'arid' | 'coastal' | 'mountain';
  popularDogBreeds: string[];
  veterinaryInsights: RegionalVeterinaryData;
  culturalContext: CulturalContext;
}

export interface CulturalFestival {
  name: string;
  nameHindi: string;
  date: string; // MM-DD format for annual events
  type: 'religious' | 'seasonal' | 'cultural' | 'regional';
  petRelevance: 'high' | 'medium' | 'low';
  safetyTips: string[];
  safetyTipsHindi: string[];
  celebrationTips?: string[];
  celebrationTipsHindi?: string[];
}

export interface RegionalVeterinaryData {
  commonDiseases: Array<{
    name: string;
    nameHindi: string;
    prevalence: 'high' | 'medium' | 'low';
    seasonality?: string;
    prevention: string[];
    preventionHindi: string[];
  }>;
  vaccinationSchedule: Array<{
    vaccine: string;
    vaccineHindi: string;
    ageRange: string;
    importance: 'mandatory' | 'recommended' | 'optional';
  }>;
  weatherConsiderations: Array<{
    season: 'summer' | 'monsoon' | 'winter' | 'spring';
    tips: string[];
    tipsHindi: string[];
  }>;
}

export interface CulturalContext {
  greetings: { formal: string; informal: string; hindi: string };
  petTerms: Array<{ english: string; hindi: string; regional?: string }>;
  traditionalPetCare: Array<{
    practice: string;
    practiceHindi: string;
    description: string;
    descriptionHindi: string;
    safety: 'safe' | 'caution' | 'avoid';
  }>;
  localVetPhrasebook: Array<{
    english: string;
    hindi: string;
    regional?: string;
    context: string;
  }>;
}

export class RegionalContentManager {
  private regionalProfiles: Map<string, RegionalProfile> = new Map();

  constructor() {
    this.initializeRegionalProfiles();
  }

  /**
   * Initialize comprehensive regional profiles for major Indian states
   */
  private initializeRegionalProfiles() {
    // Maharashtra (West)
    this.regionalProfiles.set('maharashtra', {
      state: 'Maharashtra',
      region: 'west',
      primaryLanguages: ['marathi', 'hindi', 'english'],
      climateType: 'tropical',
      popularDogBreeds: ['indian_pariah', 'labrador', 'golden_retriever', 'german_shepherd', 'indie_mixed'],
      culturalFestivals: [
        {
          name: 'Ganesh Chaturthi',
          nameHindi: 'गणेश चतुर्थी',
          date: '08-25', // Approximate - varies by lunar calendar
          type: 'religious',
          petRelevance: 'high',
          safetyTips: [
            'Keep pets away from crowded processions',
            'Monitor for stress due to loud music and fireworks',
            'Ensure pets have ID tags during festivities',
            'Create a quiet space at home for anxious pets'
          ],
          safetyTipsHindi: [
            'पालतू जानवरों को भीड़भाड़ वाले जुलूसों से दूर रखें',
            'तेज संगीत और आतिशबाजी के कारण तनाव की निगरानी करें',
            'त्योहारों के दौरान पेट्स के पास ID टैग हों',
            'चिंतित पेट्स के लिए घर में शांत स्थान बनाएं'
          ]
        },
        {
          name: 'Gudi Padwa',
          nameHindi: 'गुड़ी पड़वा',
          date: '03-25', // Approximate
          type: 'cultural',
          petRelevance: 'medium',
          safetyTips: [
            'Keep traditional food items away from pets',
            'Be cautious with decorative elements that pets might chew'
          ],
          safetyTipsHindi: [
            'पारंपरिक भोजन पेट्स से दूर रखें',
            'सजावटी वस्तुओं से सावधान रहें जिन्हें पेट चबा सकते हैं'
          ]
        }
      ],
      veterinaryInsights: {
        commonDiseases: [
          {
            name: 'Monsoon-related skin infections',
            nameHindi: 'मानसून संबंधी त्वचा संक्रमण',
            prevalence: 'high',
            seasonality: 'June-September',
            prevention: [
              'Keep pets dry during monsoon',
              'Regular grooming and bathing',
              'Use antifungal powders as recommended by vet'
            ],
            preventionHindi: [
              'मानसून के दौरान पेट्स को सूखा रखें',
              'नियमित ग्रूमिंग और नहाना',
              'पशु चिकित्सक की सलाह पर एंटीफंगल पाउडर का उपयोग'
            ]
          }
        ],
        vaccinationSchedule: [
          {
            vaccine: 'Rabies',
            vaccineHindi: 'रैबीज़',
            ageRange: '3-4 months',
            importance: 'mandatory'
          },
          {
            vaccine: 'DHPPi (5-in-1)',
            vaccineHindi: 'DHPPi (5-इन-1)',
            ageRange: '6-8 weeks',
            importance: 'mandatory'
          }
        ],
        weatherConsiderations: [
          {
            season: 'monsoon',
            tips: [
              'Avoid long walks during heavy rains',
              'Dry paws thoroughly after walks',
              'Watch for waterlogging and street flooding'
            ],
            tipsHindi: [
              'तेज बारिश के दौरान लंबी सैर से बचें',
              'सैर के बाद पंजों को अच्छी तरह सुखाएं',
              'जलभराव और सड़क पर बाढ़ का ध्यान रखें'
            ]
          }
        ]
      },
      culturalContext: {
        greetings: {
          formal: 'Namaskar',
          informal: 'Hello',
          hindi: 'नमस्कार'
        },
        petTerms: [
          { english: 'dog', hindi: 'कुत्ता', regional: 'कुत्रा (kutra)' },
          { english: 'puppy', hindi: 'पिल्ला', regional: 'पिल्लू (pillu)' },
          { english: 'good boy/girl', hindi: 'अच्छा बच्चा', regional: 'चांगला मुलगा/मुलगी' }
        ],
        traditionalPetCare: [
          {
            practice: 'Turmeric paste for wounds',
            practiceHindi: 'घावों के लिए हल्दी का पेस्ट',
            description: 'Natural antiseptic properties',
            descriptionHindi: 'प्राकृतिक एंटीसेप्टिक गुण',
            safety: 'caution'
          }
        ],
        localVetPhrasebook: [
          {
            english: 'My dog is not eating',
            hindi: 'मेरा कुत्ता खाना नहीं खा रहा',
            regional: 'माझा कुत्रा जेवत नाही',
            context: 'Common complaint at vet'
          }
        ]
      }
    });

    // Karnataka (South)
    this.regionalProfiles.set('karnataka', {
      state: 'Karnataka',
      region: 'south',
      primaryLanguages: ['kannada', 'english', 'hindi'],
      climateType: 'tropical',
      popularDogBreeds: ['indian_pariah', 'rajapalayam', 'chippiparai', 'labrador', 'german_shepherd'],
      culturalFestivals: [
        {
          name: 'Karva Chauth',
          nameHindi: 'करवा चौथ',
          date: '10-24', // Approximate
          type: 'religious',
          petRelevance: 'medium',
          safetyTips: [
            'Keep fasting food away from pets',
            'Monitor pets during evening celebrations'
          ],
          safetyTipsHindi: [
            'व्रत का खाना पेट्स से दूर रखें',
            'शाम के उत्सव के दौरान पेट्स की निगरानी करें'
          ]
        },
        {
          name: 'Dussehra',
          nameHindi: 'दशहरा',
          date: '10-15', // Approximate
          type: 'religious',
          petRelevance: 'high',
          safetyTips: [
            'Keep pets indoors during fireworks',
            'Use noise-cancelling methods for anxious pets',
            'Avoid crowded celebration areas'
          ],
          safetyTipsHindi: [
            'आतिशबाजी के दौरान पेट्स को घर के अंदर रखें',
            'चिंतित पेट्स के लिए शोर रद्द करने के तरीकों का उपयोग करें',
            'भीड़भाड़ वाले उत्सव क्षेत्रों से बचें'
          ]
        }
      ],
      veterinaryInsights: {
        commonDiseases: [
          {
            name: 'Tick fever',
            nameHindi: 'टिक बुखार',
            prevalence: 'high',
            seasonality: 'Year-round',
            prevention: [
              'Regular tick checks and removal',
              'Use vet-approved tick prevention products',
              'Keep grass areas trimmed'
            ],
            preventionHindi: [
              'नियमित टिक जांच और हटाना',
              'पशु चिकित्सक द्वारा अनुमोदित टिक रोकथाम उत्पादों का उपयोग',
              'घास के क्षेत्रों को छोटा रखें'
            ]
          }
        ],
        vaccinationSchedule: [
          {
            vaccine: 'Leptospirosis',
            vaccineHindi: 'लेप्टोस्पायरोसिस',
            ageRange: '12-16 weeks',
            importance: 'recommended'
          }
        ],
        weatherConsiderations: [
          {
            season: 'summer',
            tips: [
              'Early morning and evening walks only',
              'Ensure constant access to fresh water',
              'Watch for signs of heat stroke'
            ],
            tipsHindi: [
              'केवल सुबह जल्दी और शाम की सैर',
              'ताजे पानी की निरंतर उपलब्धता सुनिश्चित करें',
              'हीट स्ट्रोक के संकेतों पर ध्यान दें'
            ]
          }
        ]
      },
      culturalContext: {
        greetings: {
          formal: 'Namaskara',
          informal: 'Hi',
          hindi: 'नमस्कार'
        },
        petTerms: [
          { english: 'dog', hindi: 'कुत्ता', regional: 'नाಯಿ (nayi)' },
          { english: 'good dog', hindi: 'अच्छा कुत्ता', regional: 'ಒಳ್ಳೆಯ ನಾಯಿ (olleya nayi)' }
        ],
        traditionalPetCare: [
          {
            practice: 'Neem oil for skin conditions',
            practiceHindi: 'त्वचा की स्थिति के लिए नीम का तेल',
            description: 'Natural antibacterial and antifungal',
            descriptionHindi: 'प्राकृतिक जीवाणुरोधी और एंटीफंगल',
            safety: 'safe'
          }
        ],
        localVetPhrasebook: [
          {
            english: 'Vaccination needed',
            hindi: 'टीकाकरण की जरूरत',
            regional: 'ಲಸಿಕೆ ಬೇಕು (lasike beku)',
            context: 'Veterinary appointment'
          }
        ]
      }
    });

    // Add more states as needed...
    // This is a comprehensive template that can be extended
  }

  /**
   * Get regional profile for a user based on location
   */
  public getRegionalProfile(location: string): RegionalProfile | null {
    const locationLower = location.toLowerCase();
    
    // Try to match state names
    for (const [state, profile] of this.regionalProfiles) {
      if (locationLower.includes(state) || locationLower.includes(profile.state.toLowerCase())) {
        return profile;
      }
    }

    // Try to match major cities to states
    const cityStateMapping: Record<string, string> = {
      'mumbai': 'maharashtra',
      'pune': 'maharashtra',
      'nagpur': 'maharashtra',
      'thane': 'maharashtra',
      'bangalore': 'karnataka',
      'bengaluru': 'karnataka',
      'mysore': 'karnataka',
      'mangalore': 'karnataka'
    };

    for (const [city, state] of Object.entries(cityStateMapping)) {
      if (locationLower.includes(city)) {
        return this.regionalProfiles.get(state) || null;
      }
    }

    return null;
  }

  /**
   * Get upcoming cultural festivals relevant to pets
   */
  public getUpcomingFestivals(
    location: string,
    daysAhead: number = 30
  ): Array<CulturalFestival & { daysUntil: number; relevanceScore: number }> {
    const profile = this.getRegionalProfile(location);
    if (!profile) return [];

    const today = new Date();
    const currentYear = today.getFullYear();
    
    const upcomingFestivals = profile.culturalFestivals
      .map(festival => {
        const [month, day] = festival.date.split('-').map(Number);
        const festivalDate = new Date(currentYear, month - 1, day);
        
        // If festival has passed this year, check next year
        if (festivalDate < today) {
          festivalDate.setFullYear(currentYear + 1);
        }
        
        const daysUntil = Math.ceil((festivalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        // Calculate relevance score
        let relevanceScore = 0;
        switch (festival.petRelevance) {
          case 'high': relevanceScore = 3; break;
          case 'medium': relevanceScore = 2; break;
          case 'low': relevanceScore = 1; break;
        }
        
        return {
          ...festival,
          daysUntil,
          relevanceScore
        };
      })
      .filter(festival => festival.daysUntil <= daysAhead)
      .sort((a, b) => a.daysUntil - b.daysUntil);

    return upcomingFestivals;
  }

  /**
   * Get regional health recommendations based on season and location
   */
  public getRegionalHealthRecommendations(
    location: string,
    currentSeason?: 'summer' | 'monsoon' | 'winter' | 'spring'
  ): {
    commonDiseases: Array<any>;
    seasonalTips: Array<any>;
    vaccinationReminders: Array<any>;
  } {
    const profile = this.getRegionalProfile(location);
    if (!profile) {
      return {
        commonDiseases: [],
        seasonalTips: [],
        vaccinationReminders: []
      };
    }

    // Determine current season if not provided
    const season = currentSeason || this.getCurrentSeason();

    const seasonalTips = profile.veterinaryInsights.weatherConsiderations
      .filter(consideration => consideration.season === season);

    return {
      commonDiseases: profile.veterinaryInsights.commonDiseases,
      seasonalTips,
      vaccinationReminders: profile.veterinaryInsights.vaccinationSchedule
    };
  }

  /**
   * Get culturally appropriate communication phrases
   */
  public getCulturalPhrases(location: string, context: 'vet' | 'general' | 'emergency'): Array<{
    english: string;
    hindi: string;
    regional?: string;
    usage: string;
  }> {
    const profile = this.getRegionalProfile(location);
    if (!profile) return [];

    const phrases: Array<{ english: string; hindi: string; regional?: string; usage: string }> = [];

    // Add greeting
    phrases.push({
      english: `Hello (${profile.culturalContext.greetings.formal})`,
      hindi: profile.culturalContext.greetings.hindi,
      usage: 'Respectful greeting'
    });

    // Add context-specific phrases
    if (context === 'vet') {
      phrases.push(...profile.culturalContext.localVetPhrasebook.map(phrase => ({
        english: phrase.english,
        hindi: phrase.hindi,
        regional: phrase.regional,
        usage: phrase.context
      })));
    }

    return phrases;
  }

  /**
   * Get localized content recommendations
   */
  public getLocalizedContentRecommendations(
    userId: string,
    location: string,
    preferredLanguage: 'en' | 'hi'
  ): Promise<{
    regionalTips: string[];
    culturalInsights: string[];
    localVetInfo: string[];
    festivalAlerts: Array<CulturalFestival>;
  }> {
    const profile = this.getRegionalProfile(location);
    
    if (!profile) {
      return Promise.resolve({
        regionalTips: ['General pet care tips applicable nationwide'],
        culturalInsights: [],
        localVetInfo: [],
        festivalAlerts: []
      });
    }

    const upcomingFestivals = this.getUpcomingFestivals(location, 7); // Next 7 days
    const healthRecs = this.getRegionalHealthRecommendations(location);
    
    const isHindi = preferredLanguage === 'hi';
    
    return Promise.resolve({
      regionalTips: healthRecs.seasonalTips.map(tip => 
        isHindi ? tip.tipsHindi.join(' ') : tip.tips.join(' ')
      ),
      culturalInsights: profile.culturalContext.traditionalPetCare.map(practice =>
        isHindi ? practice.descriptionHindi : practice.description
      ),
      localVetInfo: profile.culturalContext.localVetPhrasebook.map(phrase =>
        isHindi ? phrase.hindi : phrase.english
      ),
      festivalAlerts: upcomingFestivals
    });
  }

  /**
   * Determine current season based on date
   */
  private getCurrentSeason(): 'summer' | 'monsoon' | 'winter' | 'spring' {
    const month = new Date().getMonth() + 1; // 1-12
    
    if (month >= 3 && month <= 5) return 'summer';
    if (month >= 6 && month <= 9) return 'monsoon';
    if (month >= 10 && month <= 2) return 'winter';
    return 'spring';
  }

  /**
   * Get regional breed popularity and recommendations
   */
  public getRegionalBreedInsights(location: string): {
    popularBreeds: string[];
    climateConsiderations: string[];
    breedSpecificTips: Array<{
      breed: string;
      tips: string[];
      tipsHindi: string[];
    }>;
  } {
    const profile = this.getRegionalProfile(location);
    
    if (!profile) {
      return {
        popularBreeds: ['indian_pariah', 'labrador', 'golden_retriever'],
        climateConsiderations: ['Choose breeds suitable for your local climate'],
        breedSpecificTips: []
      };
    }

    const climateConsiderations = [];
    
    switch (profile.climateType) {
      case 'tropical':
        climateConsiderations.push(
          'Choose breeds with lighter coats for better heat tolerance',
          'Avoid thick-coated breeds like Huskies and St. Bernards',
          'Indian Pariah dogs are naturally adapted to tropical climate'
        );
        break;
      case 'coastal':
        climateConsiderations.push(
          'High humidity requires dogs with good heat dissipation',
          'Regular grooming essential due to moisture',
          'Watch for fungal infections in coastal areas'
        );
        break;
      // Add more climate considerations
    }

    return {
      popularBreeds: profile.popularDogBreeds,
      climateConsiderations,
      breedSpecificTips: [] // This would be populated with breed-specific regional advice
    };
  }
}

// Export singleton instance
export const regionalContentManager = new RegionalContentManager();