// apps/web/components/dashboard/restaurant-admin/recipe-card.tsx
'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useRecalculateRecipeCost } from '@/hooks/use-recipes'
import { 
  ClockIcon, 
  CurrencyDollarIcon,
  PencilIcon,
  ArrowsRightLeftIcon,
  CalculatorIcon
} from '@heroicons/react/24/outline'
import { formatCurrency } from '@/lib/utils'

interface RecipeCardProps {
  recipe: any
  onEdit: () => void
  onScale: () => void
}

export function RecipeCard({ recipe, onEdit, onScale }: RecipeCardProps) {
  const recalculateCost = useRecalculateRecipeCost()

  const handleRecalculateCost = () => {
    recalculateCost.mutate(recipe.id)
  }

  const profitMargin = recipe.averageSellingPrice > 0 
    ? ((recipe.averageSellingPrice - recipe.costPerServing) / recipe.averageSellingPrice) * 100 
    : 0

  const getProfitBadgeVariant = (margin: number) => {
    if (margin > 70) return 'success'
    if (margin > 40) return 'warning'
    return 'destructive'
  }

  return (
    <Card className="group hover:shadow-lg transition-all duration-200">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-gray-900 group-hover:text-primary-600 transition-colors">
                {recipe.name}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {recipe.category.replace('_', ' ')}
              </p>
            </div>
            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                onClick={onEdit}
                className="p-2"
              >
                <PencilIcon className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onScale}
                className="p-2"
              >
                <ArrowsRightLeftIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Description */}
          {recipe.description && (
            <p className="text-sm text-gray-600 line-clamp-2">
              {recipe.description}
            </p>
          )}

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <ClockIcon className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                {(recipe.prepTime || 0) + (recipe.cookTime || 0)} min
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <CurrencyDollarIcon className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                {formatCurrency(recipe.costPerServing || 0)}/serving
              </span>
            </div>
          </div>

          {/* Yield and Serving */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">
              Yield: {recipe.yield} {recipe.yieldUnit}
            </span>
            <span className="text-gray-500">
              Serving: {recipe.servingSize} {recipe.servingUnit}
            </span>
          </div>

          {/* Ingredients Count */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              {recipe.ingredients?.length || 0} ingredients
            </span>
            {recipe.canPrepare !== undefined && (
              <Badge variant={recipe.canPrepare ? 'success' : 'destructive'}>
                {recipe.canPrepare ? 'Can Prepare' : 'Missing Items'}
              </Badge>
            )}
          </div>

          {/* Profit Margin */}
          {profitMargin > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Profit Margin</span>
              <Badge variant={getProfitBadgeVariant(profitMargin)}>
                {profitMargin.toFixed(1)}%
              </Badge>
            </div>
          )}

          {/* Allergens */}
          {recipe.allergens?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {recipe.allergens.slice(0, 3).map((allergen: string) => (
                <Badge key={allergen} variant="outline" className="text-xs">
                  {allergen}
                </Badge>
              ))}
              {recipe.allergens.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{recipe.allergens.length - 3} more
                </Badge>
              )}
            </div>
          )}

          {/* Dietary Tags */}
          {recipe.dietaryTags?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {recipe.dietaryTags.slice(0, 2).map((tag: string) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRecalculateCost}
              disabled={recalculateCost.isPending}
              className="flex-1"
            >
              <CalculatorIcon className="w-4 h-4 mr-2" />
              {recalculateCost.isPending ? 'Calculating...' : 'Recalculate Cost'}
            </Button>
          </div>

          {/* Missing Ingredients Warning */}
          {recipe.missingIngredients?.length > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-medium text-red-800">
                Missing {recipe.missingIngredients.length} ingredients:
              </p>
              <ul className="text-xs text-red-700 mt-1">
                {recipe.missingIngredients.slice(0, 2).map((item: any) => (
                  <li key={item.name}>
                    {item.name} (need {item.shortage} more)
                  </li>
                ))}
                {recipe.missingIngredients.length > 2 && (
                  <li>+{recipe.missingIngredients.length - 2} more...</li>
                )}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}