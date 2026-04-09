import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

export const useCartStore = create((set) => ({
  cart: { items: [], totalPrice: 0 },
  setCart: (cart) => set({ cart }),
  clearCart: () => set({ cart: { items: [], totalPrice: 0 } })
}));

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
