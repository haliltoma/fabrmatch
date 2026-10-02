import { useState } from 'react'
import { Boxes } from 'lucide-react'
import { useForm, router } from '@inertiajs/react'
import { adminNav } from '~/lib/nav'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Badge } from '~/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { PageHeader } from '~/components/page_header'
import { EmptyState } from '~/components/empty_state'
import { useT } from '~/lib/i18n'

type ProductData = {
  id: string
  title: string
  slug: string
  description: string | null
  allowedMaterials: string[]
  isActive: boolean
  modelFileId: string | null
  categoryId: string | null
  tags: string[]
  sellerDesign: boolean
}

type ModelFileOption = { id: string; name: string }
type CategoryOption = { id: string; name: string; isActive: boolean }

function AddProductForm({
  onClose,
  modelFiles,
  categories,
}: {
  onClose: () => void
  modelFiles: ModelFileOption[]
  categories: CategoryOption[]
}) {
  const { t } = useT()

  const form = useForm({
    title: '',
    description: '',
    allowedMaterials: '' as string,
    modelFileId: '' as string,
    categoryId: '' as string,
    tags: '' as string,
  })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    router.post(
      '/admin/catalog',
      {
        title: form.data.title,
        description: form.data.description || undefined,
        allowedMaterials: form.data.allowedMaterials
          .split(',')
          .map((m) => m.trim())
          .filter(Boolean),
        modelFileId: form.data.modelFileId || undefined,
        categoryId: form.data.categoryId || undefined,
        tags: form.data.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      },
      { onSuccess: () => onClose() }
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label htmlFor="title">{t('Title')}</Label>
        <Input
          id="title"
          value={form.data.title}
          onChange={(e) => form.setData('title', e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="description">{t('Description')}</Label>
        <textarea
          id="description"
          className="flex min-h-20 w-full rounded-md border border-line bg-paper-raised px-3 py-2 text-sm"
          value={form.data.description}
          onChange={(e) => form.setData('description', e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="materials">{t('Allowed Materials (comma separated)')}</Label>
        <Input
          id="materials"
          placeholder={t('PLA, PETG, ABS, RESIN')}
          value={form.data.allowedMaterials}
          onChange={(e) => form.setData('allowedMaterials', e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="modelFile">{t('Model file (needed for the storefront)')}</Label>
        <select
          id="modelFile"
          className="flex h-10 w-full rounded-md border border-line bg-paper-raised px-3 py-2 text-sm"
          value={form.data.modelFileId}
          onChange={(e) => form.setData('modelFileId', e.target.value)}
        >
          <option value="">{t('None (not sold in the shop)')}</option>
          {modelFiles.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="category">{t('Category')}</Label>
        <select
          id="category"
          className="flex h-10 w-full rounded-md border border-line bg-paper-raised px-3 py-2 text-sm"
          value={form.data.categoryId}
          onChange={(e) => form.setData('categoryId', e.target.value)}
        >
          <option value="">{t('No category')}</option>
          {categories
            .filter((c) => c.isActive)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </select>
      </div>
      <div>
        <Label htmlFor="tags">{t('Tags (comma separated, up to 8)')}</Label>
        <Input
          id="tags"
          placeholder={t('desk, organiser, gift')}
          value={form.data.tags}
          onChange={(e) => form.setData('tags', e.target.value)}
        />
      </div>
      <Button type="submit" disabled={form.processing}>
        {t('Create Product')}
      </Button>
    </form>
  )
}

export default function AdminCatalogIndex({
  products,
  modelFiles,
  categories,
}: {
  products: ProductData[]
  modelFiles: ModelFileOption[]
  categories: CategoryOption[]
}) {
  const { t } = useT()

  const [showAdd, setShowAdd] = useState(false)
  const [newCategory, setNewCategory] = useState('')

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('Catalog')}
        description={t(
          'Ready-made designs sellers can list. A product needs an analysed model to be sold.'
        )}
        action={<Button onClick={() => setShowAdd(true)}>{t('Add product')}</Button>}
      />

      <form
        className="flex flex-wrap items-end gap-2 rounded-lg border border-line bg-paper-raised p-4"
        onSubmit={(e) => {
          e.preventDefault()
          router.post(
            '/admin/categories',
            { name: newCategory },
            { onSuccess: () => setNewCategory('') }
          )
        }}
      >
        <div className="space-y-1">
          <Label htmlFor="new-category">{t('New category')}</Label>
          <Input
            id="new-category"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
          />
        </div>
        <Button type="submit" variant="outline" disabled={newCategory.trim().length < 2}>
          {t('Add category')}
        </Button>
        <ul className="flex flex-wrap gap-2 text-sm">
          {categories.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className={`rounded-full border px-3 py-1 ${c.isActive ? 'border-line text-ink-800' : 'border-line text-ink-500 line-through'}`}
                onClick={() =>
                  router.post(`/admin/categories/${c.id}/toggle`, { isActive: !c.isActive })
                }
                title={c.isActive ? t('Click to retire') : t('Click to restore')}
              >
                {c.name}
              </button>
            </li>
          ))}
        </ul>
      </form>

      {products.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title={t('The catalog is empty')}
          description={t(
            'Add a design with its model file. Sellers can then list it and buyers can order it.'
          )}
          action={<Button onClick={() => setShowAdd(true)}>{t('Add the first product')}</Button>}
        />
      ) : (
        <div className="grid gap-4">
          {products.map((product) => (
            <Card key={product.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{product.title}</CardTitle>
                  <p className="text-sm text-ink-600">/{product.slug}</p>
                </div>
                <div className="flex items-center gap-2">
                  {product.sellerDesign && <Badge variant="outline">{t('Seller design')}</Badge>}
                  <Badge variant={product.isActive ? 'success' : 'secondary'}>
                    {product.isActive ? t('Active') : t('Inactive')}
                  </Badge>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      router.post(`/admin/catalog/${product.id}/toggle`)
                    }}
                  >
                    <Button variant="outline" size="sm" type="submit">
                      {product.isActive ? t('Deactivate') : t('Activate')}
                    </Button>
                  </form>
                </div>
              </CardHeader>
              <CardContent>
                {product.description && (
                  <p className="mb-2 text-sm text-ink-700">{product.description}</p>
                )}
                <div className="flex flex-wrap gap-1">
                  {product.allowedMaterials.map((m) => (
                    <Badge key={m} variant="outline">
                      {m}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Add Catalog Product')}</DialogTitle>
          </DialogHeader>
          <AddProductForm
            onClose={() => setShowAdd(false)}
            modelFiles={modelFiles}
            categories={categories}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

AdminCatalogIndex.layout = 'dashboard'
AdminCatalogIndex.dashboardProps = { navItems: adminNav, title: 'Admin' }
