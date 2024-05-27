import {
  BatchMethodResponse,
  MedusaContainer,
  ProductDTO,
  ProductVariantDTO,
} from "@medusajs/types"
import {
  promiseAll,
  remoteQueryObjectFromString,
  ContainerRegistrationKeys,
} from "@medusajs/utils"

const isPricing = (fieldName: string) =>
  fieldName.startsWith("variants.prices") ||
  fieldName.startsWith("*variants.prices") ||
  fieldName.startsWith("prices") ||
  fieldName.startsWith("*prices")

// The variant had prices before, but that is not part of the price_set money amounts. Do we remap the request and response or not?
export const remapKeysForProduct = (selectFields: string[]) => {
  const productFields = selectFields.filter(
    (fieldName: string) => !isPricing(fieldName)
  )
  const pricingFields = selectFields
    .filter((fieldName: string) => isPricing(fieldName))
    .map((fieldName: string) =>
      fieldName.replace("variants.prices.", "variants.price_set.prices.")
    )

  return [...productFields, ...pricingFields]
}

export const remapKeysForVariant = (selectFields: string[]) => {
  const variantFields = selectFields.filter(
    (fieldName: string) => !isPricing(fieldName)
  )
  const pricingFields = selectFields
    .filter((fieldName: string) => isPricing(fieldName))
    .map((fieldName: string) =>
      fieldName.replace("prices.", "price_set.prices.")
    )

  return [...variantFields, ...pricingFields]
}

export const remapProductResponse = (product: ProductDTO) => {
  return {
    ...product,
    variants: product.variants?.map(remapVariantResponse),
  }
}

export const remapVariantResponse = (variant: ProductVariantDTO) => {
  if (!variant) {
    return variant
  }

  return {
    ...variant,
    prices: (variant as any).price_set?.prices?.map((price) => ({
      id: price.id,
      amount: price.amount,
      currency_code: price.currency_code,
      min_quantity: price.min_quantity,
      max_quantity: price.max_quantity,
      variant_id: variant.id,
      created_at: price.created_at,
      updated_at: price.updated_at,
    })),
    price_set: undefined,
  }
}

export const refetchProduct = async (
  productId: string,
  scope: MedusaContainer,
  fields: string[]
) => {
  const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const queryObject = remoteQueryObjectFromString({
    entryPoint: "product",
    variables: {
      filters: { id: productId },
    },
    fields: remapKeysForProduct(fields ?? []),
  })

  const products = await remoteQuery(queryObject)
  return products[0]
}

export const refetchBatchProducts = async (
  batchResult: BatchMethodResponse<ProductDTO>,
  scope: MedusaContainer,
  fields: string[]
) => {
  const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  let created = Promise.resolve<ProductDTO[]>([])
  let updated = Promise.resolve<ProductDTO[]>([])

  if (batchResult.created.length) {
    const createdQuery = remoteQueryObjectFromString({
      entryPoint: "product",
      variables: {
        filters: { id: batchResult.created.map((p) => p.id) },
      },
      fields: remapKeysForProduct(fields ?? []),
    })

    created = remoteQuery(createdQuery)
  }

  if (batchResult.updated.length) {
    const updatedQuery = remoteQueryObjectFromString({
      entryPoint: "product",
      variables: {
        filters: { id: batchResult.updated.map((p) => p.id) },
      },
      fields: remapKeysForProduct(fields ?? []),
    })

    updated = remoteQuery(updatedQuery)
  }

  const [createdRes, updatedRes] = await promiseAll([created, updated])
  return {
    created: createdRes,
    updated: updatedRes,
    deleted: batchResult.deleted,
  }
}

export const refetchBatchVariants = async (
  batchResult: BatchMethodResponse<ProductVariantDTO>,
  scope: MedusaContainer,
  fields: string[]
) => {
  const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  let created = Promise.resolve<ProductVariantDTO[]>([])
  let updated = Promise.resolve<ProductVariantDTO[]>([])

  if (batchResult.created.length) {
    const createdQuery = remoteQueryObjectFromString({
      entryPoint: "variant",
      variables: {
        filters: { id: batchResult.created.map((v) => v.id) },
      },
      fields: remapKeysForVariant(fields ?? []),
    })

    created = remoteQuery(createdQuery)
  }

  if (batchResult.updated.length) {
    const updatedQuery = remoteQueryObjectFromString({
      entryPoint: "variant",
      variables: {
        filters: { id: batchResult.updated.map((v) => v.id) },
      },
      fields: remapKeysForVariant(fields ?? []),
    })

    updated = remoteQuery(updatedQuery)
  }

  const [createdRes, updatedRes] = await promiseAll([created, updated])
  return {
    created: createdRes,
    updated: updatedRes,
    deleted: batchResult.deleted,
  }
}
