import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getDisplaySize, getSizePricingForProduct } from '../utils/sizeStock';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: (userData, token) => {
        localStorage.setItem('token', token);
        set({ user: userData, token, isAuthenticated: true });
      },
      logout: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null, isAuthenticated: false });
      },
      updateUser: (userData) => set({ user: userData })
    }),
    {
      name: 'auth-storage'
    }
  )
);

const DEFAULT_COLOR = 'Default';

const normalizeItemColor = (color) => {
  const normalized = String(color || '').trim();
  return normalized || DEFAULT_COLOR;
};

const getProductId = (productOrId) => String(productOrId?._id || productOrId || '');

const getItemUnitPrice = (item) => {
  const product = item?.product;

  if (!product || typeof product !== 'object') {
    return 0;
  }

  const itemSize = getDisplaySize(item?.size);
  const sizePricing = getSizePricingForProduct(product, itemSize);
  return Number(sizePricing.price || product.price || 0);
};

const calculateCartTotal = (items = []) => {
  return items.reduce((total, item) => {
    const quantity = Math.max(1, Math.floor(Number(item?.quantity || 1)));
    return total + (getItemUnitPrice(item) * quantity);
  }, 0);
};

const normalizeCartPayload = (cart = {}) => {
  const items = Array.isArray(cart?.items) ? cart.items : [];

  return {
    items,
    totalPrice: Number.isFinite(Number(cart?.totalPrice))
      ? Number(cart.totalPrice)
      : calculateCartTotal(items)
  };
};

const findItemIndex = (items, productId, size, color) => items.findIndex((item) => {
  const itemProductId = getProductId(item?.product);
  const itemSize = getDisplaySize(item?.size);
  const itemColor = normalizeItemColor(item?.color);

  return itemProductId === getProductId(productId)
    && itemSize === getDisplaySize(size)
    && itemColor === normalizeItemColor(color);
});

export const useCartStore = create(
  persist(
    (set) => ({
      cart: { items: [], totalPrice: 0 },
      setCart: (cart) => set({ cart: normalizeCartPayload(cart) }),
      addGuestItem: ({ product, size, color, quantity = 1 }) => set((state) => {
        const productId = getProductId(product);
        if (!productId || !size) {
          return state;
        }

        const nextItems = [...(state.cart?.items || [])];
        const itemIndex = findItemIndex(nextItems, productId, size, color);
        const normalizedQuantity = Math.max(1, Math.floor(Number(quantity || 1)));

        if (itemIndex > -1) {
          nextItems[itemIndex] = {
            ...nextItems[itemIndex],
            quantity: Math.max(1, Math.floor(Number(nextItems[itemIndex].quantity || 1)) + normalizedQuantity)
          };
        } else {
          nextItems.push({
            product,
            size: getDisplaySize(size),
            color: normalizeItemColor(color),
            quantity: normalizedQuantity
          });
        }

        return {
          cart: {
            items: nextItems,
            totalPrice: calculateCartTotal(nextItems)
          }
        };
      }),
      updateGuestItem: ({ productId, size, color, quantity }) => set((state) => {
        const nextItems = [...(state.cart?.items || [])];
        const itemIndex = findItemIndex(nextItems, productId, size, color);

        if (itemIndex === -1) {
          return state;
        }

        const nextQuantity = Math.floor(Number(quantity || 0));

        if (nextQuantity <= 0) {
          nextItems.splice(itemIndex, 1);
        } else {
          nextItems[itemIndex] = {
            ...nextItems[itemIndex],
            quantity: nextQuantity
          };
        }

        return {
          cart: {
            items: nextItems,
            totalPrice: calculateCartTotal(nextItems)
          }
        };
      }),
      removeGuestItem: ({ productId, size, color }) => set((state) => {
        const nextItems = [...(state.cart?.items || [])];
        const itemIndex = findItemIndex(nextItems, productId, size, color);

        if (itemIndex === -1) {
          return state;
        }

        nextItems.splice(itemIndex, 1);

        return {
          cart: {
            items: nextItems,
            totalPrice: calculateCartTotal(nextItems)
          }
        };
      }),
      clearCart: () => set({ cart: { items: [], totalPrice: 0 } })
    }),
    {
      name: 'cart-storage'
    }
  )
);

export const useProductStore = create((set) => ({
  products: [],
  featuredProducts: [],
  selectedProduct: null,
  filters: {
    category: 'All',
    search: '',
    sort: 'newest',
    minPrice: '',
    maxPrice: ''
  },
  setProducts: (products) => set({ products }),
  setFeaturedProducts: (featuredProducts) => set({ featuredProducts }),
  setSelectedProduct: (product) => set({ selectedProduct: product }),
  setFilters: (filters) => set((state) => ({ 
    filters: { ...state.filters, ...filters } 
  })),
  resetFilters: () => set({
    filters: {
      category: 'All',
      search: '',
      sort: 'newest',
      minPrice: '',
      maxPrice: ''
    }
  })
}));
