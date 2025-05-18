import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOrders, updateOrderStatus, fetchOrderDetails, clearOrderDetails } from './orderSlice';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import './OrderList.css';

const OrderList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { orders, totalPages, currentPage, orderDetails, loading, loadingDetails, orderStatusFilter } = useSelector(
    (state) => state.orders
  );
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [showFailedDeliveryModal, setShowFailedDeliveryModal] = useState(false);
  const [failedDeliveryData, setFailedDeliveryData] = useState({ orderId: null, fromStatus: '', cause: '' });

  const statusOptions = [
    { value: '', label: 'Tất cả trạng thái' },
    { value: 'READY_TO_SHIP', label: 'Chuẩn bị giao' },
    { value: 'DELIVERING', label: 'Đang giao' },
    { value: 'DELIVERED', label: 'Đã giao' },
    { value: 'FAILED_DELIVERY', label: 'Giao thất bại' },
  ];

  const statusLabels = {
    READY_TO_SHIP: 'Chuẩn bị giao',
    DELIVERING: 'Đang giao',
    DELIVERED: 'Đã giao',
    FAILED_DELIVERY: 'Giao thất bại',
  };

  const paymentMethodLabels = {
    CARD: 'Thẻ',
    COD: 'Tiền mặt',
  };

  const paymentStatusLabels = {
    SUCCESS: 'Thành công',
    PENDING: 'Chờ xử lý',
    FAILED: 'Thất bại',
  };

  const refundStatusLabels = {
    NONE: 'Không hoàn',
    PENDING_REFUND: 'Chờ hoàn',
    REFUNDED: 'Đã hoàn',
    FAILED_REFUND: 'Hoàn thất bại',
  };

  const statusActions = {
    READY_TO_SHIP: [
      { toStatus: 'DELIVERING', label: 'Bắt đầu giao' },
    ],
    DELIVERING: [
      { toStatus: 'DELIVERED', label: 'Đã giao' },
      { toStatus: 'FAILED_DELIVERY', label: 'Giao thất bại' },
    ],
  };

  const formatOrderAt = (dateString) => {
    if (!dateString) return 'N/A';
    const dateRegex = /^(\d{2}):(\d{2}):(\d{2}) (\d{2})-(\d{2})-(\d{4})$/;
    if (dateRegex.test(dateString)) {
      return dateString; // Giữ nguyên nếu đúng định dạng
    }
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${hours}:${minutes}:${seconds} ${day}-${month}-${year}`;
    } catch {
      return 'N/A';
    }
  };

  const truncateAddress = (address) => {
    if (address.length > 30) {
      return address.substring(0, 30) + '...';
    }
    return address;
  };

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchOrders({ index: currentPage, size: 10, orderStatus: orderStatusFilter }));
    }
  }, [dispatch, isAuthenticated, currentPage, orderStatusFilter]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      dispatch(fetchOrders({ index: newPage, size: 10, orderStatus: orderStatusFilter }));
    }
  };

  const handleStatusFilterChange = (e) => {
    dispatch(fetchOrders({ index: 1, size: 10, orderStatus: e.target.value }));
  };

  const handleOpenFailedDeliveryModal = (orderId, fromStatus) => {
    setFailedDeliveryData({ orderId, fromStatus, cause: '' });
    setShowFailedDeliveryModal(true);
  };

  const handleCloseFailedDeliveryModal = () => {
    setShowFailedDeliveryModal(false);
    setFailedDeliveryData({ orderId: null, fromStatus: '', cause: '' });
  };

  const handleStatusChange = async (orderId, fromStatus, toStatus) => {
    if (toStatus === 'FAILED_DELIVERY') {
      handleOpenFailedDeliveryModal(orderId, fromStatus);
      return;
    }
    try {
      await dispatch(updateOrderStatus({ orderId, fromStatus, toStatus })).unwrap();
      toast.dismiss();
      toast.success(`Chuyển trạng thái sang ${statusLabels[toStatus] || toStatus}`)
    } catch (error) {
      toast.dismiss();
      toast.error(error || 'Lỗi khi cập nhật trạng thái đơn hàng!');
    }
  };

  const handleFailedDelivery = async () => {
    const { orderId, fromStatus, cause } = failedDeliveryData;
    if (!cause.trim()) {
      toast.dismiss();
      toast.error('Vui lòng nhập lý do giao thất bại!');
      return;
    }
    try {
      await dispatch(
        updateOrderStatus({ orderId, fromStatus, toStatus: 'FAILED_DELIVERY', cause })
      ).unwrap();
      handleCloseFailedDeliveryModal();
    } catch (error) {
      toast.dismiss();
      toast.error(error || 'Lỗi khi cập nhật trạng thái giao thất bại!');
    }
  };

  const handleViewDetails = async (orderId) => {
    if (selectedOrderId === orderId) {
      setSelectedOrderId(null);
      dispatch(clearOrderDetails());
    } else {
      setSelectedOrderId(orderId);
      try {
        await dispatch(fetchOrderDetails(orderId)).unwrap();
      } catch (error) {
        toast.dismiss();
        toast.error(error || 'Lỗi khi lấy chi tiết đơn hàng!');
      }
    }
  };

  if (!isAuthenticated) {
    navigate('/employee/login');
    return null;
  }

  if (loading) return <p>Đang tải danh sách đơn hàng...</p>;

  return (
    <div className="order-list-container">
      <h2>Danh sách đơn hàng</h2>
      <div className="order-list-filter">
        <label>Lọc theo trạng thái:</label>
        <select value={orderStatusFilter} onChange={handleStatusFilterChange} className="order-status-select">
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {orders.length === 0 ? (
        <p>Không có đơn hàng nào!</p>
      ) : (
        <>
          <table className="order-table">
            <thead>
              <tr>
                <th>Mã đơn hàng</th>
                <th>Trạng thái đơn hàng</th>
                <th>Phương thức thanh toán</th>
                <th>Trạng thái thanh toán</th>
                <th>Trạng thái hoàn tiền</th>
                <th>Thời gian hoàn tiền</th>
                <th>Địa chỉ</th>
                <th>Số điện thoại</th>
                <th>Ngày đặt hàng</th>
                <th>Tổng tiền</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <>
                  <tr key={order.orderId}>
                    <td>{order.orderId}</td>
                    <td>
                      <span className={`order-status-badge order-status-${order.orderStatus.toLowerCase()}`}>
                        {statusLabels[order.orderStatus]}
                      </span>
                    </td>
                    <td>
                      <span className={`payment-method-badge payment-method-${order.paymentMethod.toLowerCase()}`}>
                        {paymentMethodLabels[order.paymentMethod]}
                      </span>
                    </td>
                    <td>
                      <span className={`payment-status-badge payment-status-${order.paymentStatus.toLowerCase()}`}>
                        {paymentStatusLabels[order.paymentStatus]}
                      </span>
                    </td>
                    <td>
                      <span className={`refund-status-badge refund-status-${order.refundStatus.toLowerCase()}`}>
                        {refundStatusLabels[order.refundStatus]}
                      </span>
                    </td>
                    <td>
                      {order.refundAt ? formatOrderAt(order.refundAt) : '-'}
                    </td>
                    <td>{truncateAddress(order.address)}</td>
                    <td>{order.phoneNumber}</td>
                    <td>{formatOrderAt(order.orderAt)}</td>
                    <td>{order.totalPrice.toLocaleString('vi-VN')} VNĐ</td>
                    <td>
                      <div className="order-actions">
                        <button
                          className="order-action-details"
                          onClick={() => handleViewDetails(order.orderId)}
                        >
                          {selectedOrderId === order.orderId ? 'Ẩn chi tiết' : 'Xem chi tiết'}
                        </button>
                        {statusActions[order.orderStatus] && (
                          <>
                            {statusActions[order.orderStatus].map((action) => (
                              <button
                                key={action.toStatus}
                                className={
                                  action.toStatus === 'FAILED_DELIVERY'
                                    ? 'order-action-cancel'
                                    : 'order-action-approve'
                                }
                                onClick={() =>
                                  handleStatusChange(order.orderId, order.orderStatus, action.toStatus)
                                }
                              >
                                {action.label}
                              </button>
                            ))}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  {selectedOrderId === order.orderId && (
                    <tr>
                      <td colSpan="11">
                        <div className="order-details">
                          {loadingDetails ? (
                            <p>Đang tải chi tiết đơn hàng...</p>
                          ) : orderDetails.length > 0 ? (
                            <>
                              <div className="order-details-info">
                                <p><strong>Họ và tên :</strong> {order.fullName}</p>
                                <p className="wrapped-text"><strong>Địa chỉ:</strong> {order.address}</p>
                                <p><strong>Số điện thoại:</strong> {order.phoneNumber}</p>
                              </div>
                              <table className="order-details-table">
                                <thead>
                                  <tr>
                                    <th>Ảnh bìa</th>
                                    <th>Tên sách</th>
                                    <th>Số lượng</th>
                                    <th>Tổng tiền</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {orderDetails.map((detail) => (
                                    <tr key={detail.orderDetailId}>
                                      <td>
                                        {detail.urlThumbnail ? (
                                          <img
                                            src={detail.urlThumbnail}
                                            alt={detail.bookName}
                                            className="order-detail-image"
                                          />
                                        ) : (
                                          'Không có ảnh'
                                        )}
                                      </td>
                                      <td>{detail.bookName}</td>
                                      <td>{detail.quantity}</td>
                                      <td>{detail.totalPrice.toLocaleString('vi-VN')} VNĐ</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </>
                          ) : (
                            <p>Không có chi tiết đơn hàng!</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
          <div className="order-pagination">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="pagination-button"
            >
              Trang trước
            </button>
            <span>
              Trang {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="pagination-button"
            >
              Trang sau
            </button>
          </div>
        </>
      )}

      {showFailedDeliveryModal && (
        <div className="order-modal">
          <div className="order-modal-content">
            <h3>Lý do giao thất bại</h3>
            <textarea
              className="order-failed-delivery-reason"
              value={failedDeliveryData.cause}
              onChange={(e) =>
                setFailedDeliveryData({ ...failedDeliveryData, cause: e.target.value })
              }
              placeholder="Nhập lý do giao thất bại..."
              rows="4"
            />
            <div className="order-modal-actions">
              <button
                className="order-modal-button order-modal-cancel"
                onClick={handleCloseFailedDeliveryModal}
              >
                Hủy
              </button>
              <button
                className="order-modal-button order-modal-confirm"
                onClick={handleFailedDelivery}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderList;