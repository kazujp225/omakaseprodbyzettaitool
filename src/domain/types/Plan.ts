export interface Plan {
  id: string
  orgId: string
  name: string
  monthlyPrice: number
  setupFee: number | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export type CreatePlanInput = Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>
