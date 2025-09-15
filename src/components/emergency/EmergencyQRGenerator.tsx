'use client';

import { useState, useEffect } from 'react';
import { QrCode, Download, Print, Shield, AlertTriangle, Phone, MapPin, Heart } from 'lucide-react';

interface Dog {
  id: string;
  name: string;
  breed: string;
  photo_url?: string;
}

interface EmergencyQRGeneratorProps {
  dogs: Dog[];
}

export default function EmergencyQRGenerator({ dogs }: EmergencyQRGeneratorProps) {
  const [selectedDogId, setSelectedDogId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [qrData, setQrData] = useState<any>(null);
  const [error, setError] = useState('');

  const generateQR = async () => {
    if (!selectedDogId) {
      setError('Please select a dog');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('woofadaar_token');
      const response = await fetch('/api/emergency/generate-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ dogId: selectedDogId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate QR code');
      }

      setQrData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const loadExistingQR = async (dogId: string) => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('woofadaar_token');
      const response = await fetch(`/api/emergency/generate-qr?dogId=${dogId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setQrData(data);
      }
    } catch (err) {
      // Ignore errors for existing QR check
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDogId) {
      loadExistingQR(selectedDogId);
    }
  }, [selectedDogId]);

  const downloadQR = () => {
    if (!qrData?.qr_code_image) return;

    const link = document.createElement('a');
    link.download = `emergency-qr-${qrData.emergency_data.dog.name}.png`;
    link.href = qrData.qr_code_image;
    link.click();
  };

  const printQR = () => {
    if (!qrData) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Emergency QR Code - ${qrData.emergency_data.dog.name}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 20px;
              max-width: 400px;
              margin: 0 auto;
            }
            .qr-container {
              border: 2px solid #dc2626;
              padding: 20px;
              margin: 20px 0;
              border-radius: 10px;
            }
            .emergency-header {
              background: #dc2626;
              color: white;
              padding: 10px;
              border-radius: 5px;
              margin-bottom: 15px;
              font-weight: bold;
            }
            .dog-info {
              margin: 15px 0;
              font-size: 14px;
            }
            .qr-code {
              margin: 20px 0;
            }
            .instructions {
              font-size: 12px;
              color: #666;
              margin-top: 15px;
              text-align: left;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <div class="emergency-header">
              🆘 EMERGENCY QR CODE 🆘
            </div>
            
            <div class="dog-info">
              <strong>${qrData.emergency_data.dog.name}</strong><br>
              ${qrData.emergency_data.dog.breed} • ${qrData.emergency_data.dog.gender}<br>
              ${qrData.emergency_data.dog.age_months >= 12 ? 
                Math.floor(qrData.emergency_data.dog.age_months / 12) + ' years' : 
                qrData.emergency_data.dog.age_months + ' months'
              }
            </div>
            
            <div class="qr-code">
              <img src="${qrData.qr_code_image}" alt="Emergency QR Code" style="max-width: 200px;">
            </div>
            
            <div style="font-size: 12px; font-weight: bold; color: #dc2626;">
              QR Code: ${qrData.qr_code}
            </div>
            
            <div class="instructions">
              <strong>EMERGENCY INSTRUCTIONS:</strong><br>
              • Scan this QR code for emergency medical info<br>
              • Use only in case of emergency<br>
              • Contains critical medical information<br>
              • Includes emergency contacts & vet finder<br><br>
              
              <strong>Emergency Contact:</strong><br>
              ${qrData.emergency_data.emergency_contacts.primary || 'See QR code'}<br>
              ${qrData.emergency_data.emergency_contacts.phone || ''}
            </div>
          </div>
          
          <div style="font-size: 10px; color: #999; margin-top: 20px;">
            Generated by Woofadaar • woofadaar.com
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.print();
  };

  const selectedDog = dogs.find(dog => dog.id === selectedDogId);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-red-100 rounded-lg">
            <QrCode className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Emergency QR Code Generator</h2>
            <p className="text-sm text-gray-600">Create an emergency QR code for your dog's critical medical information</p>
          </div>
        </div>

        {/* Dog Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Dog
          </label>
          <select
            value={selectedDogId}
            onChange={(e) => setSelectedDogId(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          >
            <option value="">Choose a dog...</option>
            {dogs.map((dog) => (
              <option key={dog.id} value={dog.id}>
                {dog.name} - {dog.breed}
              </option>
            ))}
          </select>
        </div>

        {/* Generate Button */}
        {selectedDogId && !qrData && (
          <button
            onClick={generateQR}
            disabled={loading}
            className="w-full bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading ? 'Generating QR Code...' : 'Generate Emergency QR Code'}
          </button>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span className="text-sm text-red-800">{error}</span>
          </div>
        )}

        {/* QR Code Display */}
        {qrData && (
          <div className="mt-6 space-y-6">
            {/* QR Code Preview */}
            <div className="bg-gray-50 rounded-lg p-6 text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Emergency QR Code for {qrData.emergency_data.dog.name}
              </h3>
              
              <div className="inline-block bg-white p-4 rounded-lg shadow-sm">
                <img 
                  src={qrData.qr_code_image} 
                  alt="Emergency QR Code"
                  className="w-64 h-64 mx-auto"
                />
              </div>
              
              <div className="mt-4 text-sm text-gray-600">
                QR Code: <span className="font-mono font-medium">{qrData.qr_code}</span>
              </div>
              
              <div className="mt-4 flex justify-center gap-4">
                <button
                  onClick={downloadQR}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                <button
                  onClick={printQR}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Print className="w-4 h-4" />
                  Print
                </button>
              </div>
            </div>

            {/* Emergency Data Preview */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h4 className="font-semibold text-yellow-900 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Emergency Information Summary
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h5 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <Heart className="w-4 h-4" />
                    Pet Details
                  </h5>
                  <div className="space-y-1 text-sm text-gray-700">
                    <div><strong>Name:</strong> {qrData.emergency_data.dog.name}</div>
                    <div><strong>Breed:</strong> {qrData.emergency_data.dog.breed}</div>
                    <div><strong>Age:</strong> {
                      qrData.emergency_data.dog.age_months >= 12 ? 
                        Math.floor(qrData.emergency_data.dog.age_months / 12) + ' years' : 
                        qrData.emergency_data.dog.age_months + ' months'
                    }</div>
                    <div><strong>Weight:</strong> {qrData.emergency_data.dog.weight_kg} kg</div>
                    {qrData.emergency_data.dog.microchip_id && (
                      <div><strong>Microchip:</strong> {qrData.emergency_data.dog.microchip_id}</div>
                    )}
                  </div>
                </div>

                <div>
                  <h5 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Emergency Contacts
                  </h5>
                  <div className="space-y-1 text-sm text-gray-700">
                    {qrData.emergency_data.emergency_contacts.primary && (
                      <div><strong>Contact:</strong> {qrData.emergency_data.emergency_contacts.primary}</div>
                    )}
                    {qrData.emergency_data.emergency_contacts.phone && (
                      <div><strong>Phone:</strong> {qrData.emergency_data.emergency_contacts.phone}</div>
                    )}
                    <div><strong>Owner:</strong> {qrData.emergency_data.owner.name}</div>
                    {qrData.emergency_data.owner.location && (
                      <div><strong>Location:</strong> {qrData.emergency_data.owner.location}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Medical Information Preview */}
              {(qrData.emergency_data.critical_medical?.allergies?.length > 0 || 
                qrData.emergency_data.critical_medical?.current_medications?.length > 0) && (
                <div className="mt-6 pt-4 border-t border-yellow-300">
                  <h5 className="font-medium text-gray-900 mb-2">Critical Medical Information</h5>
                  
                  {qrData.emergency_data.critical_medical?.allergies?.length > 0 && (
                    <div className="mb-3">
                      <strong className="text-red-700">Allergies:</strong>
                      <ul className="text-sm text-gray-700 mt-1">
                        {qrData.emergency_data.critical_medical.allergies.map((allergy: any, index: number) => (
                          <li key={index}>• {allergy.title}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {qrData.emergency_data.critical_medical?.current_medications?.length > 0 && (
                    <div>
                      <strong className="text-blue-700">Current Medications:</strong>
                      <ul className="text-sm text-gray-700 mt-1">
                        {qrData.emergency_data.critical_medical.current_medications.map((med: any, index: number) => (
                          <li key={index}>• {med.name} - {med.dosage} ({med.frequency})</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h4 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                How to Use This QR Code
              </h4>
              
              <div className="space-y-3 text-sm text-blue-800">
                {qrData.instructions && Object.entries(qrData.instructions).map(([key, instruction]) => (
                  <div key={key}>
                    <strong className="capitalize">{key.replace('_', ' ')}:</strong> {instruction as string}
                  </div>
                ))}
              </div>
              
              <div className="mt-4 p-3 bg-blue-100 rounded border border-blue-300">
                <strong className="text-blue-900">🔗 Access URL:</strong>
                <div className="text-sm font-mono text-blue-700 break-all">{qrData.access_url}</div>
              </div>
            </div>

            {/* Usage Statistics */}
            {qrData.access_count !== undefined && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 mb-2">QR Code Statistics</h5>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Total Accesses:</strong> {qrData.access_count}
                  </div>
                  {qrData.last_accessed && (
                    <div>
                      <strong>Last Accessed:</strong> {new Date(qrData.last_accessed).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}