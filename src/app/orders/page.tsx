import { OrdersPage } from '@/components/orders-page';
import { pageMetadata } from '@/lib/page-metadata';

export const metadata = pageMetadata('Orders', 'Place limit and time-weighted orders through the live CoW Protocol orderbook.', '/orders');

export default function OrdersRoute() { return <OrdersPage />; }
