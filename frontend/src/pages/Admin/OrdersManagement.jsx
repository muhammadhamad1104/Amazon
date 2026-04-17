import { useEffect, useMemo, useState } from 'react';
import { FaSync, FaSave } from 'react-icons/fa';
import { toast } from 'react-toastify';
import Loader from '../../components/Loader/Loader';
import { ordersAPI } from '../../api/api';
import { formatPKR } from '../../utils/currency';
import { getDisplaySize, sortSizeKeys } from '../../utils/sizeStock';
import './OrdersManagement.css';

const ORDER_STATUS_OPTIONS = ['Pending', 'Processing', 'Shipped', 'Received', 'Delivered', 'Cancelled'];
const PAYMENT_STATUS_OPTIONS = ['Pending', 'Cleared'];

const getPaymentStatus = (order) => {
  if (order?.isPaid || order?.paymentResult?.status === 'Cleared') {
    return 'Cleared';
  }
  return 'Pending';
};

const getOrderStatusClass = (status) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'pending') return 'pending';
  if (normalized === 'processing') return 'processing';
  if (normalized === 'shipped') return 'shipped';
  if (normalized === 'received') return 'received';
  if (normalized === 'delivered') return 'delivered';
  if (normalized === 'cancelled') return 'cancelled';
  return 'default';
};

const getOrderSizeQuantityBreakdown = (order) => {
  const sizeTotals = (order?.items || []).reduce((accumulator, item) => {
    const size = getDisplaySize(item?.size, 'N/A');
    const color = String(item?.color || 'Default').trim() || 'Default';
    const quantity = Math.max(0, Math.floor(Number(item?.quantity || 0)));

    if (quantity <= 0) return accumulator;

    const variantKey = `${size} / ${color}`;
    accumulator[variantKey] = (accumulator[variantKey] || 0) + quantity;
    return accumulator;
  }, {});

  return sortSizeKeys(Object.keys(sizeTotals)).map((size) => ({
    size,
    quantity: sizeTotals[size]
  }));
};

const OrdersManagement = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [drafts, setDrafts] = useState({});

  const fetchOrders = async ({ silent = false } = {}) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const { data } = await ordersAPI.getAllForAdmin();
      setOrders(data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return orders;

    return orders.filter((order) => {
      const orderCode = order._id?.slice(-8).toLowerCase() || '';
      const customerName = order.user?.name?.toLowerCase() || '';
      const customerEmail = order.user?.email?.toLowerCase() || '';
      const status = order.status?.toLowerCase() || '';
      const paymentStatus = getPaymentStatus(order).toLowerCase();
      return [orderCode, customerName, customerEmail, status, paymentStatus].some((value) => value.includes(query));
    });
  }, [orders, searchTerm]);

  const handleDraftChange = (orderId, field, value) => {
    setDrafts((prev) => ({
      ...prev,
      [orderId]: {
        ...prev[orderId],
        [field]: value
      }
    }));
  };

  const saveOrderUpdate = async (order) => {
    const currentPaymentStatus = getPaymentStatus(order);
    const draft = drafts[order._id] || {};
    const selectedStatus = draft.status ?? order.status;
    const selectedPaymentStatus = draft.paymentStatus ?? currentPaymentStatus;

    const payload = {};
    if (selectedStatus !== order.status) payload.status = selectedStatus;
    if (selectedPaymentStatus !== currentPaymentStatus) payload.paymentStatus = selectedPaymentStatus;

    if (!payload.status && !payload.paymentStatus) {
      toast.info('No changes to save for this order');
      return;
    }

    try {
      setUpdatingOrderId(order._id);
      const { data } = await ordersAPI.updateAdminStatus(order._id, payload);
      setOrders((prev) => prev.map((existing) => (existing._id === order._id ? data : existing)));
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[order._id];
        return next;
      });
      toast.success('Order status updated');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update order');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="orders-management">
      <div className="orders-management-header">
        <div>
          <h1>Orders Management</h1>
          <p className="orders-management-subtitle">Update order progress and payment clearance</p>
        </div>
        <button
          type="button"
          className="refresh-orders-btn"
          onClick={() => fetchOrders({ silent: true })}
          disabled={refreshing}
        >
          <FaSync className={refreshing ? 'spin' : ''} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="orders-admin-filters">
        <input
          type="text"
          placeholder="Search by order id, customer, email, status..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
        <div className="orders-count">{filteredOrders.length} orders</div>
      </div>

      <div className="orders-admin-table-wrap">
        <table className="orders-admin-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Total</th>
              <th>Items</th>
              <th>Current Status</th>
              <th>Payment</th>
              <th>Set Status</th>
              <th>Set Payment</th>
              <th>Save</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order) => {
              const draft = drafts[order._id] || {};
              const currentPaymentStatus = getPaymentStatus(order);
              const selectedStatus = draft.status ?? order.status;
              const selectedPaymentStatus = draft.paymentStatus ?? currentPaymentStatus;
              const isSaving = updatingOrderId === order._id;
              const sizeQuantityBreakdown = getOrderSizeQuantityBreakdown(order);
              const totalRequestedItems = sizeQuantityBreakdown.reduce(
                (total, entry) => total + entry.quantity,
                0
              );

              return (
                <tr key={order._id}>
                  <td data-label="Order">
                    <div className="order-ref">#{order._id.slice(-8).toUpperCase()}</div>
                  </td>
                  <td data-label="Customer">
                    <div className="customer-name">{order.user?.name || 'Unknown User'}</div>
                    <div className="customer-email">{order.user?.email || 'No Email'}</div>
                  </td>
                  <td data-label="Date">{new Date(order.createdAt).toLocaleDateString('en-US')}</td>
                  <td data-label="Total" className="order-amount">{formatPKR(order.totalPrice)}</td>
                  <td data-label="Items">
                    <div className="order-items-meta">
                      <span className="items-total-count">{totalRequestedItems} item(s)</span>
                      <div className="size-qty-list">
                        {sizeQuantityBreakdown.length > 0 ? (
                          sizeQuantityBreakdown.map((entry) => (
                            <span key={`${order._id}-${entry.size}`} className="size-qty-chip">
                              {entry.size}: {entry.quantity}
                            </span>
                          ))
                        ) : (
                          <span className="size-qty-chip empty">No items</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td data-label="Current Status">
                    <span className={`order-pill ${getOrderStatusClass(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td data-label="Payment">
                    <span className={`payment-pill ${currentPaymentStatus === 'Cleared' ? 'cleared' : 'pending'}`}>
                      {currentPaymentStatus}
                    </span>
                  </td>
                  <td data-label="Set Status">
                    <select
                      value={selectedStatus}
                      onChange={(event) => handleDraftChange(order._id, 'status', event.target.value)}
                    >
                      {ORDER_STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </td>
                  <td data-label="Set Payment">
                    <select
                      value={selectedPaymentStatus}
                      onChange={(event) => handleDraftChange(order._id, 'paymentStatus', event.target.value)}
                    >
                      {PAYMENT_STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </td>
                  <td data-label="Save">
                    <button
                      type="button"
                      className="save-order-btn"
                      onClick={() => saveOrderUpdate(order)}
                      disabled={isSaving}
                    >
                      <FaSave />
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredOrders.length === 0 && (
          <div className="no-orders-admin">No orders found for this search.</div>
        )}
      </div>
    </div>
  );
};

export default OrdersManagement;
