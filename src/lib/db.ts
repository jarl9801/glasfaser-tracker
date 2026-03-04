import Dexie, { type Table } from 'dexie'
import type { Project, DistributionPoint, Connection, FieldBlowing, FieldSplicing } from '../types'

class GlasfaserDB extends Dexie {
  projects!: Table<Project>
  distributionPoints!: Table<DistributionPoint>
  connections!: Table<Connection>
  fieldBlowings!: Table<FieldBlowing>
  fieldSplicings!: Table<FieldSplicing>

  constructor() {
    super('GlasfaserTracker')
    this.version(1).stores({
      projects: '++id, projektNummer',
      distributionPoints: '++id, projectId, dp',
      connections: '++id, projectId, dp, auftragsnummer, strasse, status',
    })
    this.version(2).stores({
      projects: '++id, projektNummer',
      distributionPoints: '++id, projectId, dp',
      connections: '++id, projectId, dp, auftragsnummer, strasse, status',
      fieldBlowings: '++id, dp, calleNormalized, tecnico, certificado',
      fieldSplicings: '++id, dp, tecnico',
    })
  }
}

export const db = new GlasfaserDB()
