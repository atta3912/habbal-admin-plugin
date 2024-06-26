import { CreatePaymentCollectionForCartWorkflowInputDTO } from "@medusajs/types"
import {
  WorkflowData,
  createWorkflow,
  transform,
} from "@medusajs/workflows-sdk"
import { createPaymentCollectionsStep } from "../steps/create-payment-collection"
import { linkCartAndPaymentCollectionsStep } from "../steps/link-cart-payment-collection"

export const createPaymentCollectionForCartWorkflowId =
  "create-payment-collection-for-cart"
export const createPaymentCollectionForCartWorkflow = createWorkflow(
  createPaymentCollectionForCartWorkflowId,
  (
    input: WorkflowData<CreatePaymentCollectionForCartWorkflowInputDTO>
  ): WorkflowData<void> => {
    const created = createPaymentCollectionsStep([input])

    const link = transform({ cartId: input.cart_id, created }, (data) => ({
      links: [
        {
          cart_id: data.cartId,
          payment_collection_id: data.created[0].id,
        },
      ],
    }))

    linkCartAndPaymentCollectionsStep(link)
  }
)
