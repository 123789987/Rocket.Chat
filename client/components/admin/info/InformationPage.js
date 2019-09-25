import { Button, Icon } from '@rocket.chat/fuselage';
import React, { useEffect, useState } from 'react';

import { call } from '../../../../app/ui-utils/client/lib/callMethod';
import { useViewStatisticsPermission } from '../../../hooks/usePermissions';
import { useTranslation } from '../../../hooks/useTranslation';
import { useReactiveValue } from '../../../hooks/useReactiveValue';
import { Info } from '../../../../app/utils';
import { Header } from '../../header/Header';
import { Link } from '../../basic/Link';
import { ErrorAlert } from '../../basic/ErrorAlert';
import { RocketChatSection } from './RocketChatSection';
import { CommitSection } from './CommitSection';
import { RuntimeEnvironmentSection } from './RuntimeEnvironmentSection';
import { BuildEnvironmentSection } from './BuildEnvironmentSection';
import { UsageSection } from './UsageSection';
import { InstancesSection } from './InstancesSection';
import { useAdminSidebar } from '../useAdminSidebar';

const useStatistics = (canViewStatistics) => {
	const [isLoading, setLoading] = useState(true);
	const [statistics, setStatistics] = useState({});
	const [instances, setInstances] = useState([]);
	const [fetchStatistics, setFetchStatistics] = useState(() => () => ({}));

	useEffect(() => {
		let didCancel = false;

		const fetchStatistics = async () => {
			if (!canViewStatistics) {
				setStatistics(null);
				setInstances(null);
				return;
			}

			setLoading(true);

			try {
				const [statistics, instances] = await Promise.all([
					call('getStatistics'),
					call('instances/get'),
				]);

				if (didCancel) {
					return;
				}

				setStatistics(statistics);
				setInstances(instances);
			} finally {
				setLoading(false);
			}
		};

		setFetchStatistics(() => fetchStatistics);

		fetchStatistics();

		return () => {
			didCancel = true;
		};
	}, [canViewStatistics]);

	return {
		isLoading,
		statistics,
		instances,
		fetchStatistics,
	};
};

export function InformationPage() {
	const canViewStatistics = useViewStatisticsPermission();

	const {
		isLoading,
		statistics,
		instances,
		fetchStatistics,
	} = useStatistics(canViewStatistics);

	const info = useReactiveValue(() => Info, []);

	const t = useTranslation();

	const handleRefreshClick = () => {
		if (isLoading) {
			return;
		}

		fetchStatistics();
	};

	useAdminSidebar();

	const alertOplogForMultipleInstances = statistics && statistics.instanceCount > 1 && !statistics.oplogEnabled;

	return <section className='page-container'>
		<Header rawSectionName={t('Info')} hideHelp>
			{canViewStatistics
				&& <Header.ActionBlock>
					<Button primary type='button' onClick={handleRefreshClick}>
						<Icon name='reload' /> {t('Refresh')}
					</Button>
				</Header.ActionBlock>}
		</Header>

		<div className='content'>
			{alertOplogForMultipleInstances
				&& <ErrorAlert title={t('Error_RocketChat_requires_oplog_tailing_when_running_in_multiple_instances')}>
					<p>
						{t('Error_RocketChat_requires_oplog_tailing_when_running_in_multiple_instances_details')}
					</p>
					<p>
						<Link external href='https://rocket.chat/docs/installation/manual-installation/multiple-instances-to-improve-performance/#running-multiple-instances-per-host-to-improve-performance'>
							{t('Click_here_for_more_info')}
						</Link>
					</p>
				</ErrorAlert>}

			<RocketChatSection info={info} statistics={statistics} isLoading={isLoading} />
			<CommitSection info={info} />
			<RuntimeEnvironmentSection statistics={statistics} isLoading={isLoading} />
			<BuildEnvironmentSection info={info} />
			<UsageSection statistics={statistics} isLoading={isLoading} />
			<InstancesSection instances={instances} />
		</div>
	</section>;
}
