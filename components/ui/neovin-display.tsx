'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

interface NeoVinData {
  id: string;
  vin: string;
  year?: number;
  make?: string;
  model?: string;
  vehicleType?: string;
  trim?: string;
  version?: string;
  transmission?: string;
  drivetrain?: string;
  engine?: string;
  fuelType?: string;
  doors?: number;
  bodyType?: string;
  width?: number;
  height?: number;
  length?: number;
  weight?: number;
  cityMpg?: number;
  highwayMpg?: number;
  combinedMpg?: number;
  msrp?: number;
  deliveryCharges?: number;
  installedOptionsMsrp?: number;
  combinedMsrp?: number;
  seatingCapacity?: number;
  interiorColor?: {
    code?: string;
    name?: string;
    base?: string;
  };
  exteriorColor?: {
    code?: string;
    name?: string;
    base?: string;
  };
  rating?: {
    safetyFront?: number;
    safetySide?: number;
    safetyOverall?: number;
    rollover?: number;
    roofStrength?: string;
  };
  warranty?: {
    totalDuration?: number;
    totalDistance?: number;
    powertrainDuration?: number;
    powertrainDistance?: number;
  };
  installedOptionsDetails?: Array<{
    code: string;
    name: string;
    msrp?: string;
    salePrice?: string;
    type?: string;
  }>;
  features?: Array<{
    optionCode: string;
    category: string;
    featureType: string;
    description: string;
  }>;
  highValueFeatures?: Array<{
    optionCode: string;
    category: string;
    description: string;
  }>;
}

interface NeoVinDisplayProps {
  data: NeoVinData;
}

export function NeoVinDisplay({ data }: NeoVinDisplayProps) {
  const formatCurrency = (value?: number) => {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDistance = (value?: number) => {
    if (!value) return 'N/A';
    return `${value.toLocaleString()} miles`;
  };

  return (
    <div className="space-y-6">
      {/* Header with key information */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {data.year} {data.make} {data.model}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mt-1">
              {data.trim} {data.version}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500 dark:text-gray-500">VIN</p>
            <p className="font-mono text-sm font-medium">{data.vin}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 mb-1">Engine</p>
            <p className="font-semibold text-gray-900 dark:text-gray-100">{data.engine || 'N/A'}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 mb-1">Transmission</p>
            <p className="font-semibold text-gray-900 dark:text-gray-100">{data.transmission || 'N/A'}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 mb-1">Drivetrain</p>
            <p className="font-semibold text-gray-900 dark:text-gray-100">{data.drivetrain || 'N/A'}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 mb-1">Total MSRP</p>
            <p className="font-semibold text-red-600 dark:text-red-500">{formatCurrency(data.combinedMsrp)}</p>
          </div>
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.cityMpg || '-'}</p>
          <p className="text-xs text-gray-500">City MPG</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.highwayMpg || '-'}</p>
          <p className="text-xs text-gray-500">Highway MPG</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.doors || '-'}</p>
          <p className="text-xs text-gray-500">Doors</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.seatingCapacity || '-'}</p>
          <p className="text-xs text-gray-500">Seats</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.weight ? `${data.weight.toLocaleString()}` : '-'}</p>
          <p className="text-xs text-gray-500">Weight (lbs)</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.fuelType || '-'}</p>
          <p className="text-xs text-gray-500">Fuel Type</p>
        </div>
      </div>

      {/* Detailed Information Tabs */}
      <Tabs defaultValue="specs" className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          <TabsTrigger value="specs" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:text-red-600 dark:data-[state=active]:text-red-500">Specifications</TabsTrigger>
          <TabsTrigger value="features" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:text-red-600 dark:data-[state=active]:text-red-500">Features</TabsTrigger>
          <TabsTrigger value="options" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:text-red-600 dark:data-[state=active]:text-red-500">Options</TabsTrigger>
          <TabsTrigger value="safety" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:text-red-600 dark:data-[state=active]:text-red-500">Safety</TabsTrigger>
          <TabsTrigger value="warranty" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:text-red-600 dark:data-[state=active]:text-red-500">Warranty</TabsTrigger>
        </TabsList>

        <TabsContent value="specs" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-gray-200 dark:border-gray-700">
              <CardHeader className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <CardTitle className="text-lg font-semibold">Dimensions & Weight</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Length</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{data.length ? `${data.length} inches` : 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Width</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{data.width ? `${data.width} inches` : 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Height</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{data.height ? `${data.height} inches` : 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Curb Weight</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{data.weight ? `${data.weight.toLocaleString()} lbs` : 'N/A'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-gray-200 dark:border-gray-700">
              <CardHeader className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <CardTitle className="text-lg font-semibold">Configuration</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Body Style</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{data.bodyType || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Vehicle Type</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{data.vehicleType || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Doors</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{data.doors || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Seating Capacity</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{data.seatingCapacity ? `${data.seatingCapacity} passengers` : 'N/A'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-gray-200 dark:border-gray-700">
            <CardHeader className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <CardTitle className="text-lg font-semibold">Color Options</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Exterior Color</p>
                    {data.exteriorColor?.code && (
                      <span className="text-xs font-mono bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">{data.exteriorColor.code}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{data.exteriorColor?.name || 'N/A'}</p>
                  {data.exteriorColor?.base && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Base: {data.exteriorColor.base}</p>
                  )}
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Interior Color</p>
                    {data.interiorColor?.code && (
                      <span className="text-xs font-mono bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">{data.interiorColor.code}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{data.interiorColor?.name || 'N/A'}</p>
                  {data.interiorColor?.base && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Base: {data.interiorColor.base}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-4 mt-6">
          {data.highValueFeatures && data.highValueFeatures.length > 0 && (
            <Card className="border-gray-200 dark:border-gray-700">
              <CardHeader className="bg-red-50 dark:bg-red-900/20 border-b border-gray-200 dark:border-gray-700">
                <CardTitle className="text-lg font-semibold text-red-900 dark:text-red-100">Premium Features</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {data.highValueFeatures.map((feature, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{feature.description}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-500 ml-2">({feature.category})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-gray-200 dark:border-gray-700">
            <CardHeader className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <CardTitle className="text-lg font-semibold">All Features</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                {data.features && 
                  Object.entries(
                    data.features.reduce((acc, feature) => {
                      if (!acc[feature.category]) acc[feature.category] = [];
                      acc[feature.category].push(feature);
                      return acc;
                    }, {} as Record<string, typeof data.features>)
                  ).map(([category, features]) => (
                    <div key={category}>
                      <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                        {category}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {features.map((feature, index) => (
                          <div key={index} className="flex items-start gap-2 text-sm">
                            <span className="text-gray-400 dark:text-gray-600 mt-1">•</span>
                            <span className="text-gray-700 dark:text-gray-300">{feature.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                }
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="options" className="space-y-4 mt-6">
          <Card className="border-gray-200 dark:border-gray-700">
            <CardHeader className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <CardTitle className="text-lg font-semibold">Installed Options & Packages</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {data.installedOptionsDetails && data.installedOptionsDetails.length > 0 ? (
                  data.installedOptionsDetails.map((option, index) => (
                  <div key={index} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{option.name}</p>
                          <span className="text-xs font-mono bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">{option.code}</span>
                          {option.type && (
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${option.type === 'P' ? 'border-red-200 text-red-700 dark:border-red-800 dark:text-red-400' : 'border-gray-300 dark:border-gray-600'}`}
                            >
                              {option.type === 'P' ? 'Package' : 'Option'}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {option.salePrice ? (
                            <>
                              <span className="text-red-600 dark:text-red-500">${option.salePrice}</span>
                              {option.msrp && option.msrp !== option.salePrice && (
                                <span className="text-xs text-gray-500 line-through ml-2">${option.msrp}</span>
                              )}
                            </>
                          ) : option.msrp ? (
                            `$${option.msrp}`
                          ) : (
                            <span className="text-gray-500">Included</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500 dark:text-gray-500">No installed options data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="safety" className="space-y-4 mt-6">
          {data.rating && (
            <Card className="border-gray-200 dark:border-gray-700">
              <CardHeader className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <CardTitle className="text-lg font-semibold">Safety Ratings</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  {data.rating.safetyFront && (
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Front Impact</span>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            {[...Array(5)].map((_, i) => (
                              <div
                                key={i}
                                className={`w-4 h-4 ${
                                  i < data.rating.safetyFront
                                    ? 'bg-red-500'
                                    : 'bg-gray-200 dark:bg-gray-700'
                                } rounded-sm`}
                              />
                            ))}
                          </div>
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {data.rating.safetyFront}/5
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  {data.rating.safetySide && (
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Side Impact</span>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            {[...Array(5)].map((_, i) => (
                              <div
                                key={i}
                                className={`w-4 h-4 ${
                                  i < data.rating.safetySide
                                    ? 'bg-red-500'
                                    : 'bg-gray-200 dark:bg-gray-700'
                                } rounded-sm`}
                              />
                            ))}
                          </div>
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {data.rating.safetySide}/5
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  {data.rating.safetyOverall && (
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Overall Safety</span>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            {[...Array(5)].map((_, i) => (
                              <div
                                key={i}
                                className={`w-4 h-4 ${
                                  i < data.rating.safetyOverall
                                    ? 'bg-red-500'
                                    : 'bg-gray-200 dark:bg-gray-700'
                                } rounded-sm`}
                              />
                            ))}
                          </div>
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {data.rating.safetyOverall}/5
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  {data.rating.rollover && (
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Rollover Resistance</span>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            {[...Array(5)].map((_, i) => (
                              <div
                                key={i}
                                className={`w-4 h-4 ${
                                  i < data.rating.rollover
                                    ? 'bg-red-500'
                                    : 'bg-gray-200 dark:bg-gray-700'
                                } rounded-sm`}
                              />
                            ))}
                          </div>
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {data.rating.rollover}/5
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  {data.rating.roofStrength && (
                    <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Roof Strength</span>
                      <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                        {data.rating.roofStrength}
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="warranty" className="space-y-4 mt-6">
          {data.warranty && (
            <Card className="border-gray-200 dark:border-gray-700">
              <CardHeader className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <CardTitle className="text-lg font-semibold">Warranty Coverage</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.warranty.totalDuration && (
                    <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-red-600 dark:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Basic Coverage</p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">Bumper-to-Bumper</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Duration</span>
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{data.warranty.totalDuration} months</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Distance</span>
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatDistance(data.warranty.totalDistance)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {data.warranty.powertrainDuration && (
                    <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-red-600 dark:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Powertrain</p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">Engine & Transmission</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Duration</span>
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{data.warranty.powertrainDuration} months</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Distance</span>
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatDistance(data.warranty.powertrainDistance)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}