// apps/web/components/dashboard/restaurant-admin/create-recipe-modal.tsx
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateRecipe } from '@/hooks/use-recipes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const createRecipeSchema = z.object({
  name: z.string().min(1, 'Recipe name is required'),
  description: z.string().optional(),
  category: z.enum(['APPETIZER', 'MAIN_COURSE', 'DESSERT', 'BEVERAGE', 'SIDE_DISH', 'SAUCE', 'MARINADE', 'DRESSING', 'BREAD', 'SOUP', 'SALAD', 'PREPARATION', 'OTHER']),
  servingSize: z.number().min(0.01),
  servingUnit: z.string().min(1),
  yield: z.number().min(0.01),
  yieldUnit: z.string().min(1),
  prepTime: z.number().min(0).optional(),
  cookTime: z.number().min(0).optional(),
  instructions: z.string().optional(),
})

interface CreateRecipeModalProps {
  isOpen: boolean
  onClose: () => void
  inventoryItems: any[]
}

// apps/web/components/dashboard/restaurant-admin/create-recipe-modal.tsx (continued)
export function CreateRecipeModal({ isOpen, onClose, inventoryItems }: CreateRecipeModalProps) {
 const [ingredients, setIngredients] = useState<any[]>([])
 const createRecipe = useCreateRecipe()
 
 const {
   register,
   handleSubmit,
   formState: { errors, isValid },
   reset
 } = useForm({
   resolver: zodResolver(createRecipeSchema),
   mode: 'onChange'
 })

 const addIngredient = () => {
   setIngredients([...ingredients, { inventoryItemId: '', quantity: 0, unit: 'KG' }])
 }

 const removeIngredient = (index: number) => {
   setIngredients(ingredients.filter((_, i) => i !== index))
 }

 const updateIngredient = (index: number, field: string, value: any) => {
   const updated = [...ingredients]
   updated[index] = { ...updated[index], [field]: value }
   setIngredients(updated)
 }

 const onSubmit = async (data: any) => {
   const recipeData = {
     ...data,
     ingredients: ingredients.filter(ing => ing.inventoryItemId && ing.quantity > 0)
   }

   createRecipe.mutate(recipeData, {
     onSuccess: () => {
       reset()
       setIngredients([])
       onClose()
     }
   })
 }

 return (
   <Dialog open={isOpen} onOpenChange={onClose}>
     <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
       <DialogHeader>
         <DialogTitle>Create New Recipe</DialogTitle>
       </DialogHeader>
       <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
         <div className="grid grid-cols-2 gap-4">
           <div>
             <Label htmlFor="name">Recipe Name</Label>
             <Input
               id="name"
               placeholder="Enter recipe name"
               {...register('name')}
             />
             {errors.name && (
               <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
             )}
           </div>
           <div>
             <Label htmlFor="category">Category</Label>
             <select
               id="category"
               {...register('category')}
               className="w-full border border-gray-300 rounded-md px-3 py-2"
             >
               <option value="">Select category</option>
               <option value="APPETIZER">Appetizer</option>
               <option value="MAIN_COURSE">Main Course</option>
               <option value="DESSERT">Dessert</option>
               <option value="BEVERAGE">Beverage</option>
               <option value="SIDE_DISH">Side Dish</option>
               <option value="SAUCE">Sauce</option>
               <option value="SOUP">Soup</option>
               <option value="SALAD">Salad</option>
               <option value="OTHER">Other</option>
             </select>
           </div>
         </div>

         <div>
           <Label htmlFor="description">Description</Label>
           <Textarea
             id="description"
             placeholder="Recipe description"
             {...register('description')}
             rows={3}
           />
         </div>

         <div className="grid grid-cols-4 gap-4">
           <div>
             <Label htmlFor="servingSize">Serving Size</Label>
             <Input
               id="servingSize"
               type="number"
               step="0.01"
               {...register('servingSize', { valueAsNumber: true })}
             />
           </div>
           <div>
             <Label htmlFor="servingUnit">Serving Unit</Label>
             <Input
               id="servingUnit"
               placeholder="portion, cup, etc."
               {...register('servingUnit')}
             />
           </div>
           <div>
             <Label htmlFor="yield">Yield</Label>
             <Input
               id="yield"
               type="number"
               step="0.01"
               {...register('yield', { valueAsNumber: true })}
             />
           </div>
           <div>
             <Label htmlFor="yieldUnit">Yield Unit</Label>
             <Input
               id="yieldUnit"
               placeholder="servings, pieces, etc."
               {...register('yieldUnit')}
             />
           </div>
         </div>

         <div className="grid grid-cols-2 gap-4">
           <div>
             <Label htmlFor="prepTime">Prep Time (minutes)</Label>
             <Input
               id="prepTime"
               type="number"
               {...register('prepTime', { valueAsNumber: true })}
             />
           </div>
           <div>
             <Label htmlFor="cookTime">Cook Time (minutes)</Label>
             <Input
               id="cookTime"
               type="number"
               {...register('cookTime', { valueAsNumber: true })}
             />
           </div>
         </div>

         <div>
           <Label htmlFor="instructions">Instructions</Label>
           <Textarea
             id="instructions"
             placeholder="Step-by-step cooking instructions"
             {...register('instructions')}
             rows={4}
           />
         </div>

         <div>
           <div className="flex items-center justify-between mb-4">
             <Label>Ingredients</Label>
             <Button type="button" onClick={addIngredient} variant="outline" size="sm">
               Add Ingredient
             </Button>
           </div>
           <div className="space-y-3">
             {ingredients.map((ingredient, index) => (
               <div key={index} className="flex items-center space-x-2 p-3 border rounded-lg">
                 <select
                   value={ingredient.inventoryItemId}
                   onChange={(e) => updateIngredient(index, 'inventoryItemId', e.target.value)}
                   className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                 >
                   <option value="">Select ingredient</option>
                   {inventoryItems.map((item) => (
                     <option key={item.id} value={item.id}>
                       {item.name} ({item.unit})
                     </option>
                   ))}
                 </select>
                 <Input
                   type="number"
                   step="0.01"
                   placeholder="Quantity"
                   value={ingredient.quantity}
                   onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
                   className="w-24"
                 />
                 <select
                   value={ingredient.unit}
                   onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                   className="w-20 border border-gray-300 rounded-md px-2 py-2"
                 >
                   <option value="KG">KG</option>
                   <option value="GRAMS">Grams</option>
                   <option value="LITERS">Liters</option>
                   <option value="ML">ML</option>
                   <option value="PIECES">Pieces</option>
                   <option value="CUPS">Cups</option>
                 </select>
                 <Button
                   type="button"
                   onClick={() => removeIngredient(index)}
                   variant="destructive"
                   size="sm"
                 >
                   Remove
                 </Button>
               </div>
             ))}
           </div>
         </div>

         <div className="flex space-x-2 pt-4">
           <Button
             type="button"
             variant="outline"
             onClick={onClose}
             className="flex-1"
           >
             Cancel
           </Button>
           <Button
             type="submit"
             disabled={!isValid || createRecipe.isPending || ingredients.length === 0}
             className="flex-1"
           >
             {createRecipe.isPending ? 'Creating...' : 'Create Recipe'}
           </Button>
         </div>
       </form>
     </DialogContent>
   </Dialog>
 )
}