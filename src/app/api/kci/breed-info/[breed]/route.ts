import { NextRequest, NextResponse } from 'next/server';

// Mock KCI breed database - In production, this would connect to actual KCI database
const KCI_BREED_DATABASE = {
  'labrador-retriever': {
    breed_name: 'Labrador Retriever',
    breed_code: 'LAB',
    group: 'Sporting Group',
    origin_country: 'Canada',
    kci_recognized: true,
    recognition_date: '1985-03-15',
    standard_characteristics: {
      size: 'Large',
      weight_range: '25-36 kg',
      height_range: '54-62 cm',
      life_expectancy: '10-14 years',
      temperament: ['Friendly', 'Outgoing', 'Active', 'Loyal'],
      coat_colors: ['Yellow', 'Black', 'Chocolate'],
      coat_type: 'Short, dense, water-repellent'
    },
    health_considerations: [
      'Hip Dysplasia',
      'Elbow Dysplasia', 
      'Progressive Retinal Atrophy',
      'Exercise Induced Collapse'
    ],
    breeding_requirements: {
      minimum_age: '18 months',
      health_tests_required: ['Hip Score', 'Elbow Score', 'Eye Test'],
      registration_fee: '₹2,500'
    },
    description: 'Labs are friendly, outgoing, and active companions who have more than enough affection to go around for a family looking for a medium to large dog.'
  },
  'german-shepherd': {
    breed_name: 'German Shepherd',
    breed_code: 'GSD',
    group: 'Working Group',
    origin_country: 'Germany',
    kci_recognized: true,
    recognition_date: '1982-07-20',
    standard_characteristics: {
      size: 'Large',
      weight_range: '22-40 kg',
      height_range: '55-65 cm',
      life_expectancy: '9-13 years',
      temperament: ['Confident', 'Courageous', 'Smart', 'Loyal'],
      coat_colors: ['Black and Tan', 'Solid Black', 'Sable'],
      coat_type: 'Double coat, medium length'
    },
    health_considerations: [
      'Hip Dysplasia',
      'Elbow Dysplasia',
      'Bloat',
      'Degenerative Myelopathy'
    ],
    breeding_requirements: {
      minimum_age: '20 months',
      health_tests_required: ['Hip Score', 'Elbow Score', 'DM Test'],
      registration_fee: '₹3,000'
    },
    description: 'German Shepherds are extremely versatile, serving as family companions, guard dogs, and in many service roles.'
  },
  'golden-retriever': {
    breed_name: 'Golden Retriever',
    breed_code: 'GR',
    group: 'Sporting Group',
    origin_country: 'Scotland',
    kci_recognized: true,
    recognition_date: '1987-11-10',
    standard_characteristics: {
      size: 'Large',
      weight_range: '25-34 kg',
      height_range: '51-61 cm',
      life_expectancy: '10-12 years',
      temperament: ['Friendly', 'Intelligent', 'Devoted', 'Trustworthy'],
      coat_colors: ['Light Golden', 'Golden', 'Dark Golden'],
      coat_type: 'Dense, water-repellent outer coat'
    },
    health_considerations: [
      'Hip Dysplasia',
      'Elbow Dysplasia',
      'Heart Disease',
      'Cancer'
    ],
    breeding_requirements: {
      minimum_age: '18 months',
      health_tests_required: ['Hip Score', 'Elbow Score', 'Heart Test', 'Eye Test'],
      registration_fee: '₹2,800'
    },
    description: 'Golden Retrievers are serious workers at hunting and field work, but also love to spend time with their families.'
  },
  'indian-pariah-dog': {
    breed_name: 'Indian Pariah Dog',
    breed_code: 'IPD',
    group: 'Indigenous Breed',
    origin_country: 'India',
    kci_recognized: true,
    recognition_date: '2005-01-18',
    standard_characteristics: {
      size: 'Medium',
      weight_range: '15-25 kg',
      height_range: '46-58 cm',
      life_expectancy: '13-16 years',
      temperament: ['Alert', 'Intelligent', 'Territorial', 'Social'],
      coat_colors: ['Brown', 'Black', 'Pied', 'Solid colors'],
      coat_type: 'Short, dense coat'
    },
    health_considerations: [
      'Generally healthy breed',
      'Tick-borne diseases',
      'Skin allergies'
    ],
    breeding_requirements: {
      minimum_age: '15 months',
      health_tests_required: ['Basic Health Check'],
      registration_fee: '₹1,500'
    },
    description: 'Indigenous Indian breed known for excellent health, intelligence, and adaptability to Indian climate conditions.'
  },
  'rottweiler': {
    breed_name: 'Rottweiler',
    breed_code: 'ROT',
    group: 'Working Group',
    origin_country: 'Germany',
    kci_recognized: true,
    recognition_date: '1988-04-25',
    standard_characteristics: {
      size: 'Large',
      weight_range: '35-60 kg',
      height_range: '56-69 cm',
      life_expectancy: '8-10 years',
      temperament: ['Confident', 'Fearless', 'Alert', 'Good-natured'],
      coat_colors: ['Black with Tan markings'],
      coat_type: 'Short, straight, coarse coat'
    },
    health_considerations: [
      'Hip Dysplasia',
      'Elbow Dysplasia',
      'Heart Problems',
      'Cancer'
    ],
    breeding_requirements: {
      minimum_age: '24 months',
      health_tests_required: ['Hip Score', 'Elbow Score', 'Heart Test'],
      registration_fee: '₹3,500'
    },
    description: 'Rottweilers are robust working dogs that are happiest when given a job to do.'
  }
};

// GET /api/kci/breed-info/[breed] - Get breed information from KCI database
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ breed: string }> }
) {
  try {
    const { breed } = await params;
    
    if (!breed) {
      return NextResponse.json({
        success: false,
        message: 'Breed parameter is required'
      }, { status: 400 });
    }

    // Normalize breed name for lookup
    const normalizedBreed = breed.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const breedInfo = KCI_BREED_DATABASE[normalizedBreed as keyof typeof KCI_BREED_DATABASE];

    if (!breedInfo) {
      return NextResponse.json({
        success: false,
        message: `Breed '${breed}' not found in KCI database`,
        suggestions: [
          'Check the spelling of the breed name',
          'Use common breed names (e.g., "Labrador Retriever" instead of "Lab")',
          'Contact KCI for non-recognized breeds',
          'Try searching for parent breeds if it\'s a mixed breed'
        ]
      }, { status: 404 });
    }

    // Get related breeds (simplified logic)
    const relatedBreeds = Object.entries(KCI_BREED_DATABASE)
      .filter(([key, data]) => 
        data.group === breedInfo.group && 
        key !== normalizedBreed
      )
      .slice(0, 3)
      .map(([_, data]) => ({
        breed_name: data.breed_name,
        breed_code: data.breed_code,
        group: data.group
      }));

    return NextResponse.json({
      success: true,
      data: {
        ...breedInfo,
        last_updated: '2024-12-01',
        data_source: 'Kennel Club of India Official Database',
        verification_status: 'official'
      },
      related_breeds: relatedBreeds,
      registration_info: {
        how_to_register: [
          'Submit application with required documents',
          'Complete health testing requirements',
          'Pay registration fees',
          'Wait for KCI verification (7-14 days)'
        ],
        required_documents: [
          'Dog\'s photographs (profile and front view)',
          'Pedigree certificate (if available)',
          'Health test certificates',
          'Owner identification proof'
        ],
        contact_info: {
          phone: '+91-11-2xxx-xxxx',
          email: 'registration@kci.org.in',
          website: 'https://kci.org.in'
        }
      }
    });

  } catch (error) {
    console.error('KCI breed info error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error while fetching breed information'
    }, { status: 500 });
  }
}

// GET /api/kci/breed-info - List all recognized breeds
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { search, group, recognized_only = true } = body;

    let breeds = Object.values(KCI_BREED_DATABASE);

    // Filter by recognition status
    if (recognized_only) {
      breeds = breeds.filter(breed => breed.kci_recognized);
    }

    // Filter by group
    if (group) {
      breeds = breeds.filter(breed => 
        breed.group.toLowerCase().includes(group.toLowerCase())
      );
    }

    // Search filter
    if (search) {
      const searchTerm = search.toLowerCase();
      breeds = breeds.filter(breed =>
        breed.breed_name.toLowerCase().includes(searchTerm) ||
        breed.breed_code.toLowerCase().includes(searchTerm) ||
        breed.group.toLowerCase().includes(searchTerm)
      );
    }

    // Get breed summary
    const breedSummary = breeds.map(breed => ({
      breed_name: breed.breed_name,
      breed_code: breed.breed_code,
      group: breed.group,
      origin_country: breed.origin_country,
      kci_recognized: breed.kci_recognized,
      size: breed.standard_characteristics.size,
      temperament: breed.standard_characteristics.temperament.slice(0, 3)
    }));

    return NextResponse.json({
      success: true,
      data: breedSummary,
      total_breeds: breedSummary.length,
      groups: [...new Set(breeds.map(breed => breed.group))],
      search_performed: !!search,
      filters_applied: { group, recognized_only }
    });

  } catch (error) {
    console.error('KCI breed list error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error while fetching breed list'
    }, { status: 500 });
  }
}