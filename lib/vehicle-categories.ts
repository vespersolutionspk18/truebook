export const vehicleCategories = {
  activeSafety: {
    general: [
      'abs',
      'esc',
      'tractionControl',
      'tpmsType',
      'activeSafetyNote',
      'autoReverseSystem',
      'pedestrianAlertSound',
      'eventDataRecorder',
      'keylessIgnition',
      'saeAutomationLevelFrom',
      'saeAutomationLevelTo'
    ],
    notification: ['acn'],
    backingAndParking: [
      'backupCamera',
      'parkingAssist',
      'rearCrossTrafficAlert',
      'rearAutoEmergencyBraking'
    ],
    forwardCollision: [
      'crashImminentBraking',
      'forwardCollisionWarning',
      'dynamicBrakeSupport',
      'pedestrianAEB'
    ],
    laneAndSide: [
      'blindSpotWarning',
      'laneDepartureWarning',
      'laneKeepingAssist',
      'blindSpotIntervention',
      'laneCenteringAssist'
    ],
    lighting: [
      'daytimeRunningLight',
      'headlampLightSource',
      'headlampBeamSwitching',
      'adaptiveDrivingBeam'
    ],
    safeDistance: ['adaptiveCruiseControl']
  },
  engine: [
    'engineCylinders',
    'displacementCC',
    'displacementCI',
    'displacementL',
    'engineStrokeCycles',
    'engineModel',
    'enginePowerKW',
    'fuelTypePrimary',
    'valveTrainDesign',
    'engineConfiguration',
    'fuelTypeSecondary',
    'fuelDeliveryType',
    'engineBrakeHPFrom',
    'coolingType',
    'engineBrakeHPTo',
    'electrificationLevel',
    'otherEngineInfo',
    'turbo',
    'topSpeedMPH',
    'engineManufacturer'
  ],
  exterior: {
    body: ['bodyClass', 'doors', 'windows'],
    bus: [
      'busLength',
      'busFloorConfig',
      'busType',
      'otherBusInfo'
    ],
    dimension: [
      'wheelBaseType',
      'trackWidth',
      'gvwrFrom',
      'bedLength',
      'curbWeight',
      'wheelBaseFrom',
      'wheelBaseTo',
      'gcwrFrom',
      'gcwrTo',
      'gvwrTo'
    ],
    motorcycle: [
      'customMotorcycleType',
      'motorcycleSuspension',
      'motorcycleChassisType',
      'otherMotorcycleInfo'
    ],
    trailer: [
      'trailerConnection',
      'trailerBodyType',
      'trailerLength',
      'otherTrailerInfo'
    ],
    truck: [
      'bedType',
      'cabType'
    ],
    wheelTire: [
      'numberOfWheels',
      'wheelSizeFront',
      'wheelSizeRear'
    ]
  },
  general: [
    'destinationMarket',
    'make',
    'manufacturerName',
    'model',
    'modelYear',
    'plantCity',
    'series',
    'trim',
    'vehicleType',
    'plantCountry',
    'plantCompanyName',
    'plantState',
    'trim2',
    'series2',
    'note',
    'basePrice',
    'nonLandUse'
  ],
  interior: {
    general: [
      'entertainmentSystem',
      'steeringLocation',
      'numberOfSeats',
      'numberOfSeatRows'
    ]
  },
  mechanical: {
    battery: {
      general: [
        'otherBatteryInfo',
        'batteryType',
        'batteryCellsPerModule',
        'batteryCurrentFrom',
        'batteryVoltageFrom',
        'batteryEnergyFrom',
        'evDriveUnit',
        'batteryCurrentTo',
        'batteryVoltageTo',
        'batteryEnergyTo',
        'batteryModulesPerPack',
        'batteryPacksPerVehicle'
      ],
      charger: [
        'chargerLevel',
        'chargerPowerKW'
      ]
    },
    brake: [
      'brakeSystemType',
      'brakeSystemDescription'
    ],
    drivetrain: [
      'driveType',
      'axles',
      'axleConfiguration'
    ],
    transmission: [
      'transmissionStyle',
      'transmissionSpeeds'
    ]
  },
  passiveSafety: {
    general: [
      'pretensioner',
      'seatBeltType',
      'otherRestraintInfo'
    ],
    airbagLocations: [
      'curtainAirbagLocations',
      'seatCushionAirbagLocations',
      'frontAirbagLocations',
      'kneeAirbagLocations',
      'sideAirbagLocations'
    ]
  }
};