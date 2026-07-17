export type SosFieldDef = {
  name: string
  label: string
  type?: 'number' | 'text' | 'boolean'
}

export type SosFieldGroup = {
  id: string
  title: string
  fields: SosFieldDef[]
}

export const SOS_FIELD_GROUPS: SosFieldGroup[] = [
  {
    id: 'general',
    title: 'Sample & Evaluation',
    fields: [
      { name: 'sampleDate', label: 'Sample Date', type: 'text' },
      { name: 'labName', label: 'Lab Name', type: 'text' },
      { name: 'labNo', label: 'Lab No', type: 'text' },
      { name: 'oilType', label: 'Oil Type', type: 'text' },
      { name: 'hOil', label: 'Hour Oil', type: 'number' },
      { name: 'hUnit', label: 'Hour Unit', type: 'number' },
      { name: 'evalCode', label: 'Evaluation Code', type: 'text' },
      { name: 'oilChange', label: 'Oil Change', type: 'boolean' },
      { name: 'oilAdded', label: 'Oil Added (L)', type: 'number' },
      { name: 'recommendation', label: 'Recommendation', type: 'text' }
    ]
  },
  {
    id: 'wear-metals',
    title: 'Wear Metals',
    fields: [
      { name: 'fe', label: 'Fe', type: 'number' },
      { name: 'cu', label: 'Cu', type: 'number' },
      { name: 'cr', label: 'Cr', type: 'number' },
      { name: 'si', label: 'Si', type: 'number' },
      { name: 'al', label: 'Al', type: 'number' },
      { name: 'ni', label: 'Ni', type: 'number' },
      { name: 'sn', label: 'Sn', type: 'number' },
      { name: 'pb', label: 'Pb', type: 'number' },
      { name: 'pq', label: 'PQ', type: 'number' }
    ]
  },
  {
    id: 'contaminants',
    title: 'Contaminants',
    fields: [
      { name: 'soot', label: 'Soot', type: 'number' },
      { name: 'oxid', label: 'Oxidation', type: 'number' },
      { name: 'nitr', label: 'Nitration', type: 'number' },
      { name: 'sox', label: 'SOx', type: 'number' }
    ]
  },
  {
    id: 'particles',
    title: 'Particle Count',
    fields: [
      { name: 'p4um', label: '4µm', type: 'number' },
      { name: 'p6um', label: '6µm', type: 'number' },
      { name: 'p14um', label: '14µm', type: 'number' },
      { name: 'p15um', label: '15µm', type: 'number' },
      { name: 'iso4406', label: 'ISO 4406', type: 'text' },
      { name: 'iso14', label: 'ISO 14', type: 'text' },
      { name: 'iso6', label: 'ISO 6', type: 'text' }
    ]
  },
  {
    id: 'additives',
    title: 'Additives',
    fields: [
      { name: 'ca', label: 'Ca', type: 'number' },
      { name: 'zn', label: 'Zn', type: 'number' },
      { name: 'mo', label: 'Mo', type: 'number' },
      { name: 'bo', label: 'B', type: 'number' },
      { name: 'p', label: 'P', type: 'number' },
      { name: 'na', label: 'Na', type: 'number' },
      { name: 'k', label: 'K', type: 'number' },
      { name: 'mg', label: 'Mg', type: 'number' }
    ]
  },
  {
    id: 'physical',
    title: 'Physical Properties',
    fields: [
      { name: 'visc', label: 'Viscosity', type: 'number' },
      { name: 'tbn', label: 'TBN', type: 'number' },
      { name: 'tan', label: 'TAN', type: 'number' },
      { name: 'gly', label: 'Glycol', type: 'number' },
      { name: 'water', label: 'Water', type: 'number' },
      { name: 'dilution', label: 'Dilution', type: 'number' }
    ]
  }
]

export const SOS_DECIMAL_FIELDS = SOS_FIELD_GROUPS.flatMap(group =>
  group.fields.filter(field => field.type === 'number').map(field => field.name)
)
