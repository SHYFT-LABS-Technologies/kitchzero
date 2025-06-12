// apps/web/components/dashboard/restaurant-admin/recipe-scaler.tsx
'use client'

import { useState } from 'react'
import { useScaleRecipe } from '@/hooks/use-recipes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/utils'

interface RecipeScalerProps {
  recipe: any
  onClose: () => void
}

export function RecipeScaler({ recipe, onClose }: RecipeScalerProps) {
  const [targetYield, setTargetYield] = useState(recipe.yield)
  const [scaledData, setScaledData] = useState<any>(null)
  const scaleRecipe = useScaleRecipe()

  const handleScale = () => {
    scaleRecipe.mutate(
      { id: recipe.id, targetYield },
      {
        onSuccess: (data) => {
          setScaledData(data.data)
        }
      }
    )
  }

  const scalingFactor = targetYield / recipe.yield

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Scale Recipe: {recipe.name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Original Yield</Label>
              <p className="text-lg font-medium">{recipe.yield} {recipe.yieldUnit}</p>
            </div>
            <div>
              <Label htmlFor="targetYield">Target Yield</Label>
              <Input
                id="targetYield"
                type="number"
                step="0.1"
                value={targetYield}
                onChange={(e) => setTargetYield(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Button onClick={handleScale} disabled={scaleRecipe.isPending || targetYield <= 0}>
              {scaleRecipe.isPending ? 'Scaling...' : 'Calculate Scaled Recipe'}
            </Button>
            <span className="text-sm text-gray-600">
              Scaling Factor: {scalingFactor.toFixed(2)}x
            </span>
          </div>

          {scaledData && (
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-lg font-semibold">Scaled Recipe</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900">Cost Information</h4>
                  <div className="mt-2 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Cost per serving:</span>
                      <span>{formatCurrency(scaledData.scaledCostPerServing)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total cost:</span>
                      <span>{formatCurrency(scaledData.scaledTotalCost)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-900">Yield Information</h4>
                  <div className="mt-2 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Target yield:</span>
                      <span>{scaledData.targetYield} {recipe.yieldUnit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Scaling factor:</span>
                      <span>{scaledData.scalingFactor}x</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Scaled Ingredients</h4>
                <div className="space-y-2">
                  {scaledData.scaledIngredients?.map((ingredient: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div>
                        <span className="font-medium">{ingredient.inventoryItem.name}</span>
                        {ingredient.preparation && (
                          <span className="text-gray-600 ml-2">({ingredient.preparation})</span>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {ingredient.scaledQuantity.toFixed(2)} {ingredient.unit}
                        </div>
                        <div className="text-sm text-gray-600">
                          Cost: {formatCurrency(ingredient.scaledCost)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}