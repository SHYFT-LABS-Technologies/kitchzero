// apps/web/components/dashboard/restaurant-admin/recipe-management.tsx
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  useRecipes, 
  useCreateRecipe, 
  useUpdateRecipe,
  useRecipeProfitability,
  useRecalculateRecipeCost 
} from '@/hooks/use-recipes'
import { useInventoryItems } from '@/hooks/use-inventory'
import { CreateRecipeModal } from './create-recipe-modal'
import { RecipeCard } from './recipe-card'
import { RecipeScaler } from './recipe-scaler'
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  FunnelIcon,
  ChartBarIcon 
} from '@heroicons/react/24/outline'
import { formatCurrency } from '@/lib/utils'

export function RecipeManagement() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null)

  const { data: recipes, isLoading } = useRecipes({
    search: searchTerm || undefined,
    category: selectedCategory || undefined
  })

  const { data: profitability } = useRecipeProfitability()
  const { data: inventoryItems } = useInventoryItems()

  const categories = [
    'APPETIZER', 'MAIN_COURSE', 'DESSERT', 'BEVERAGE', 
    'SIDE_DISH', 'SAUCE', 'MARINADE', 'DRESSING'
  ]

  const filteredRecipes = recipes?.filter(recipe => 
    recipe.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Recipe Management</h2>
          <p className="text-gray-600">Create and manage recipes with cost tracking</p>
        </div>
        <Button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Create Recipe</span>
        </Button>
      </div>

      {/* Profitability Overview */}
      {profitability && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ChartBarIcon className="w-5 h-5" />
              <span>Recipe Profitability Overview</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {profitability.filter((r: any) => r.profitMargin > 70).length}
                </div>
                <div className="text-sm text-green-700">High Profit</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {profitability.filter((r: any) => r.profitMargin >= 40 && r.profitMargin <= 70).length}
                </div>
                <div className="text-sm text-yellow-700">Medium Profit</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {profitability.filter((r: any) => r.profitMargin < 40).length}
                </div>
                <div className="text-sm text-red-700">Low Profit</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(profitability.reduce((sum: number, r: any) => sum + r.costPerServing, 0) / profitability.length)}
                </div>
                <div className="text-sm text-blue-700">Avg Cost/Serving</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search recipes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center space-x-2">
              <FunnelIcon className="w-4 h-4 text-gray-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recipe Grid */}
      {isLoading ? (
        <RecipeGridSkeleton />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.map((recipe: any) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onEdit={() => setSelectedRecipe(recipe)}
              onScale={() => setSelectedRecipe(recipe)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateRecipeModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        inventoryItems={inventoryItems || []}
      />

      {selectedRecipe && (
        <RecipeScaler
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
        />
      )}
    </div>
  )
}

function RecipeGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
              <div className="flex space-x-2">
                <div className="h-6 bg-gray-200 rounded w-16"></div>
                <div className="h-6 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}