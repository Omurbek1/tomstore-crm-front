import { ProductModal, type ProductModalProps } from "./ProductModal";

type Props = Omit<ProductModalProps, "isEditing" | "onSubmit"> & {
  onCreate: ProductModalProps["onSubmit"];
};

export const CreateProductModal = ({
  open,
  form,
  products,
  suppliers,
  branches,
  productCategoryOptions,
  newProductCategory,
  setNewProductCategory,
  addCategoryLoading,
  productIsCombo,
  comboAvailableFromSelection,
  productPhotoUrls,
  isUploadingPhoto,
  onCancel,
  onAddCategory,
  onUploadProductPhoto,
  onCreate,
}: Props) => {
  return (
    <ProductModal
      open={open}
      form={form}
      isEditing={false}
      products={products}
      suppliers={suppliers}
      branches={branches}
      productCategoryOptions={productCategoryOptions}
      newProductCategory={newProductCategory}
      setNewProductCategory={setNewProductCategory}
      addCategoryLoading={addCategoryLoading}
      productIsCombo={productIsCombo}
      comboAvailableFromSelection={comboAvailableFromSelection}
      productPhotoUrls={productPhotoUrls}
      isUploadingPhoto={isUploadingPhoto}
      onCancel={onCancel}
      onAddCategory={onAddCategory}
      onUploadProductPhoto={onUploadProductPhoto}
      onSubmit={onCreate}
    />
  );
};
