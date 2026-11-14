import PageContainer from '../components/layout/PageContainer';
import ErrorScreen from '../components/common/ErrorScreen';

export default function NotFound() {
  return (
    <PageContainer narrow>
      <ErrorScreen code="ERR_404" title="SYSTEM ERROR" message="This level doesn't exist. Something went wrong." />
    </PageContainer>
  );
}
