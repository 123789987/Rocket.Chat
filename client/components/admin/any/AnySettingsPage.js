import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Random } from 'meteor/random';
import { TAPi18n } from 'meteor/rocketchat:tap-i18n';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import s from 'underscore.string';
import toastr from 'toastr';

import { PrivateSettingsCachedCollection } from '../../../../app/ui-admin/client/SettingsCachedCollection';
import { handleError } from '../../../../app/utils/client';
import { useAtLeastOnePermission } from '../../../hooks/usePermissions';
import { useReactiveValue } from '../../../hooks/useReactiveValue';
import { useToggle } from '../../../hooks/useToggle';
import { useTranslation } from '../../../hooks/useTranslation';
import { Button } from '../../basic/Button';
import { Icon } from '../../basic/Icon';
import { MarkdownText } from '../../basic/MarkdownText';
import { RawText } from '../../basic/RawText';
import { Header } from '../../header/Header';
import { useAdminSidebar } from '../useAdminSidebar';


function SettingsGroupSectionPanel({ children, name, defaultCollapsed, help }) {
	const [collapsed, toggleCollapsed] = useToggle(defaultCollapsed);

	const t = useTranslation();

	const handleTitleClick = () => {
		toggleCollapsed();
	};

	return <div className={['section', collapsed && 'section-collapsed'].filter(Boolean).join(' ')}>
		{name && <div className='section-title' onClick={handleTitleClick}>
			<div className='section-title-text'>{t(name)}</div>
			<div className='section-title-right'>
				<Button nude title={collapsed ? t('Expand') : t('Collapse')}>
					<Icon icon={collapsed ? 'icon-angle-down' : 'icon-angle-up'} />
				</Button>
			</div>
		</div>}

		<div className='section-content border-component-color'>
			{help && <div className='section-helper'>{help}</div>}

			{children}
		</div>
	</div>;
}

const usePrivateSettingsCollection = () => {
	const collection = useMemo(() => {
		const cachedCollection = new PrivateSettingsCachedCollection();
		cachedCollection.init();
		return cachedCollection.collection;
	}, []);

	return collection;
};

const SettingsContext = createContext([]);

function StringSettingInput({ setting, onUpdate }) {
	const {
		_id,
		multiline,
		value,
		placeholder,
		readonly,
		autocomplete,
		disabled,
	} = setting;

	const handleChange = (event) => {
		const { value } = event.currentTarget;
		onUpdate((current) => ({ value, changed: current.value !== value }));
	};

	if (multiline) {
		return <textarea
			className='rc-input__element'
			name={_id}
			rows='4'
			style={{ height: 'auto' }}
			value={value}
			placeholder={placeholder}
			disabled={disabled}
			readOnly={readonly}
			onChange={handleChange}
		/>;
	}

	return <input
		type='text'
		className='rc-input__element'
		name={_id}
		value={value}
		placeholder={placeholder}
		disabled={disabled}
		readOnly={readonly}
		autoComplete={autocomplete === false ? 'off' : undefined}
		onChange={handleChange}
	/>;
}

function RelativeUrlSettingInput({ setting }) {
	const {
		_id,
		value,
		placeholder,
		readonly,
		autocomplete,
		disabled,
	} = setting;

	const { formCollection, collection } = useContext(SettingsContext);

	const handleChange = (event) => {
		const { value } = event.currentTarget;
		formCollection.update({ _id }, { $set: { value, changed: collection.findOne(_id).value !== value } });
	};

	return <input type='url' className='rc-input__element' name={_id} value={Meteor.absoluteUrl(value)} placeholder={placeholder} disabled={disabled} readOnly={readonly} autoComplete={autocomplete === false ? 'off' : undefined} onChange={handleChange} />;
}

function PasswordSettingInput({ setting }) {
	const {
		_id,
		value,
		placeholder,
		readonly,
		autocomplete,
		disabled,
	} = setting;

	const { formCollection, collection } = useContext(SettingsContext);

	const handleChange = (event) => {
		const { value } = event.currentTarget;
		formCollection.update({ _id }, { $set: { value, changed: collection.findOne(_id).value !== value } });
	};

	return <input type='password' className='rc-input__element' name={_id} value={value} placeholder={placeholder} disabled={disabled} readOnly={readonly} autoComplete={autocomplete === false ? 'off' : undefined} onChange={handleChange} />;
}

function IntSettingInput({ setting }) {
	const {
		_id,
		value,
		placeholder,
		readonly,
		autocomplete,
		disabled,
	} = setting;

	const { formCollection, collection } = useContext(SettingsContext);

	const handleChange = (event) => {
		const value = parseInt(event.currentTarget.value, 10);
		formCollection.update({ _id }, { $set: { value, changed: collection.findOne(_id).value !== value } });
	};

	return <input type='number' className='rc-input__element' name={_id} value={value} placeholder={placeholder} disabled={disabled} readOnly={readonly} autoComplete={autocomplete === false ? 'off' : undefined} onChange={handleChange} />;
}

function BooleanSettingInput({ setting }) {
	const {
		_id,
		value,
		readonly,
		autocomplete,
		disabled,
	} = setting;

	const t = useTranslation();

	const { formCollection, collection } = useContext(SettingsContext);

	const handleChange = (event) => {
		const value = event.currentTarget.value === '1';
		formCollection.update({ _id }, { $set: { value, changed: collection.findOne(_id).value !== value } });
	};

	return <>
		<label>
			<input type='radio' name={_id} value='1' checked={value === true} disabled={disabled} readOnly={readonly} autoComplete={autocomplete === false ? 'off' : undefined} onChange={handleChange} /> {t('True')}
		</label>
		<label>
			<input type='radio' name={_id} value='0' checked={value === false} disabled={disabled} readOnly={readonly} autoComplete={autocomplete === false ? 'off' : undefined} onChange={handleChange} /> {t('False')}
		</label>
	</>;
}

function SelectSettingInput({ setting }) {
	const {
		_id,
		value,
		readonly,
		values,
		disabled,
	} = setting;

	const t = useTranslation();

	const { formCollection, collection } = useContext(SettingsContext);

	const handleChange = (event) => {
		const { value } = event.currentTarget;
		formCollection.update({ _id }, { $set: { value, changed: collection.findOne(_id).value !== value } });
	};

	return <div className='rc-select'>
		<select className='rc-select__element' name={_id} value={value} disabled={disabled} readOnly={readonly} onChange={handleChange}>
			{values.map(({ key, i18nLabel }) =>
				<option key={key} value={key}>{t(i18nLabel)}</option>
			)}
		</select>
		<Icon block='rc-select__arrow' icon='arrow-down' />
	</div>;
}

function LanguageSettingInput({ setting }) {
	const {
		_id,
		value,
		readonly,
		disabled,
	} = setting;

	const { formCollection, collection } = useContext(SettingsContext);

	const languages = useReactiveValue(() => {
		const languages = TAPi18n.getLanguages();

		const result = Object.entries(languages)
			.map(([key, language]) => ({ ...language, key: key.toLowerCase() }))
			.sort((a, b) => a.key - b.key);

		result.unshift({
			name: 'Default',
			en: 'Default',
			key: '',
		});

		return result;
	}, []);

	const handleChange = (event) => {
		const { value } = event.currentTarget;
		formCollection.update({ _id }, { $set: { value, changed: collection.findOne(_id).value !== value } });
	};

	return <div className='rc-select'>
		<select className='rc-select__element' name={_id} disabled={disabled} readOnly={readonly} value={value} onChange={handleChange}>
			{languages.map(({ key, name }) =>
				<option key={key} value={key} dir='auto'>{name}</option>
			)}
		</select>
		<Icon block='rc-select__arrow' icon='arrow-down' />
	</div>;
}


function ColorSettingInput({ setting }) {
	const {
		_id,
		value,
		editor,
		allowedTypes,
		autocomplete,
		disabled,
	} = setting;

	const t = useTranslation();

	const { formCollection, collection } = useContext(SettingsContext);

	const handleChange = (event) => {
		const { value } = event.currentTarget;
		formCollection.update({ _id }, { $set: { value, changed: collection.findOne(_id).value !== value } });
	};

	const handleEditorTypeChange = (event) => {
		const editor = event.currentTarget.value.trim();
		formCollection.update({ _id }, { $set: { editor, changed: collection.findOne(_id).editor !== editor } });
	};

	return <>
		<div className='horizontal'>
			{editor === 'color' && <div className='flex-grow-1'>
				<input className='rc-input__element colorpicker-input' type='text' name={_id} value={value} autoComplete='off' disabled={disabled} onChange={handleChange} />
				<span className='colorpicker-swatch border-component-color' style={{ backgroundColor: value }} />
			</div>}
			{editor === 'expression' && <div className='flex-grow-1'>
				<input className='rc-input__element' type='text' name={_id} value={value} disabled={disabled} autoComplete={autocomplete === false ? 'off' : undefined} onChange={handleChange} />
			</div>}
			<div className='color-editor'>
				<select name='color-editor' value={editor} onChange={handleEditorTypeChange}>
					{allowedTypes && allowedTypes.map((allowedType) =>
						<option key={allowedType} value={allowedType}>{t(allowedType)}</option>)}
				</select>
			</div>
		</div>
		<div className='settings-description'>Variable name: {_id.replace(/theme-color-/, '@')}</div>
	</>;
}

function FontSettingInput({ setting }) {
	const {
		_id,
		value,
		placeholder,
		readonly,
		autocomplete,
		disabled,
	} = setting;

	const { formCollection, collection } = useContext(SettingsContext);

	const handleChange = (event) => {
		const { value } = event.currentTarget;
		formCollection.update({ _id }, { $set: { value, changed: collection.findOne(_id).value !== value } });
	};

	return <input type='text' className='rc-input__element' name={_id} value={value} placeholder={placeholder} disabled={disabled} readOnly={readonly} autoComplete={autocomplete === false ? 'off' : undefined} onChange={handleChange} />;
}

function CodeSettingInput({ setting }) {
	const {
		_id,
		i18nLabel,
		disabled,
	} = setting;

	const t = useTranslation();

	return disabled
		? <>{/* {> CodeMirror name=_id options=(getEditorOptions true) code=(i18nDefaultValue) }*/}</>
		: <div className='code-mirror-box' data-editor-id={_id}>
			<div className='title'>{(i18nLabel && t(i18nLabel)) || (_id || t(_id))}</div>
			{/* {> CodeMirror name=_id options=getEditorOptions code=value editorOnBlur=setEditorOnBlur}*/}

			<div className='buttons'>
				<Button primary className='button-fullscreen'>{t('Full_Screen')}</Button>
				<Button primary className='button-restore'>{t('Exit_Full_Screen')}</Button>
			</div>
		</div>;
}

function ActionSettingInput({ setting, didSectionChange }) {
	const {
		value,
		actionText,
		disabled,
	} = setting;

	const t = useTranslation();

	const handleClick = async () => {
		Meteor.call(value, (err, data) => {
			if (err) {
				err.details = Object.assign(err.details || {}, {
					errorTitle: 'Error',
				});
				handleError(err);
				return;
			}

			const args = [data.message].concat(data.params);
			toastr.success(TAPi18n.__.apply(TAPi18n, args), TAPi18n.__('Success'));
		});
	};

	return didSectionChange
		? <span style={{ lineHeight: '40px' }} className='secondary-font-color'>{t('Save_to_enable_this_action')}</span>
		: <Button primary disabled={disabled} onClick={handleClick}>{t(actionText)}</Button>;
}

function AssetSettingInput({ setting }) {
	const {
		value,
		fileConstraints,
	} = setting;

	const t = useTranslation();
	return value.url
		? <div className='settings-file-preview'>
			<div className='preview' style={{ backgroundImage: `url(${ value.url }?_dc=${ Random.id() })` }} />
			<div className='action'>
				<Button className='delete-asset'>
					<Icon icon='icon-trash' />{t('Delete')}
				</Button>
			</div>
		</div>
		: <div className='settings-file-preview'>
			<div className='preview no-file background-transparent-light secondary-font-color'><Icon icon='icon-upload' /></div>
			<div className='action'>
				<div className='rc-button rc-button--primary'>{t('Select_file')}
					<input type='file' accept={fileConstraints.extensions && fileConstraints.extensions.length && `.${ fileConstraints.extensions.join(', .') }`} />
				</div>
			</div>
		</div>;
}

function RoomPickSettingInput({ setting }) {
	const {
		_id,
	} = setting;

	const collection = usePrivateSettingsCollection();
	const [selectedRooms, setSelectedRooms] = useState({});

	useEffect(() => {
		const withRoomPickType = (f) => (data) => {
			if (data.type !== 'roomPick') {
				return;
			}

			f(data);
		};

		collection.find().observe({
			added: withRoomPickType((data) => {
				setSelectedRooms({
					...selectedRooms,
					[data._id]: data.value,
				});
			}),
			changed: withRoomPickType((data) => {
				setSelectedRooms({
					...selectedRooms,
					[data._id]: data.value,
				});
			}),
			removed: withRoomPickType((data) => {
				setSelectedRooms(
					Object.entries(selectedRooms)
						.filter(([key]) => key !== data._id)
						.reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {})
				);
			}),
		});
	}, [collection]);

	return <div>
		{/* {{> inputAutocomplete settings=autocompleteRoom id=_id name=_id class="search autocomplete rc-input__element" autocomplete="off" disabled=isDisabled.disabled}} */}
		<ul class='selected-rooms'>
			{(selectedRooms[_id] || []).map(({ name }) =>
				<li key={name} className='remove-room' data-setting={_id}>
					{name} <Icon icon='icon-cancel' />
				</li>
			)}
		</ul>
	</div>;
}

function SettingField({ setting, didSectionChange, onUpdate }) {
	const t = useTranslation();

	const { changed } = setting;

	const hasResetButton = !setting.disableReset && !setting.readonly && setting.type !== 'asset' && setting.value !== setting.packageValue && !setting.blocked;

	const collection = usePrivateSettingsCollection();
	const [selectedRooms, setSelectedRooms] = useState({});

	useEffect(() => {
		const withRoomPickType = (f) => (data) => {
			if (data.type !== 'roomPick') {
				return;
			}

			f(data);
		};

		collection.find().observe({
			added: withRoomPickType((data) => {
				setSelectedRooms({
					...selectedRooms,
					[data._id]: data.value,
				});
			}),
			changed: withRoomPickType((data) => {
				setSelectedRooms({
					...selectedRooms,
					[data._id]: data.value,
				});
			}),
			removed: withRoomPickType((data) => {
				setSelectedRooms(
					Object.entries(selectedRooms)
						.filter(([key]) => key !== data._id)
						.reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {})
				);
			}),
		});
	}, [collection]);

	return <div className={['input-line', 'double-col', changed && 'setting-changed'].filter(Boolean).join(' ')}>
		<label className='setting-label' title={setting._id}>{(setting.i18nLabel && t(setting.i18nLabel)) || (setting._id || t(setting._id))}</label>
		<div className='setting-field'>
			{setting.type === 'string' && <StringSettingInput setting={setting} onUpdate={onUpdate} />}
			{setting.type === 'relativeUrl' && <RelativeUrlSettingInput setting={setting} onUpdate={onUpdate} />}
			{setting.type === 'password' && <PasswordSettingInput setting={setting} onUpdate={onUpdate} />}
			{setting.type === 'int' && <IntSettingInput setting={setting} onUpdate={onUpdate} />}
			{setting.type === 'boolean' && <BooleanSettingInput setting={setting} onUpdate={onUpdate} />}
			{setting.type === 'select' && <SelectSettingInput setting={setting} onUpdate={onUpdate} />}
			{setting.type === 'language' && <LanguageSettingInput setting={setting} onUpdate={onUpdate} />}
			{setting.type === 'color' && <ColorSettingInput setting={setting} onUpdate={onUpdate} />}
			{setting.type === 'font' && <FontSettingInput setting={setting} onUpdate={onUpdate} />}
			{setting.type === 'code' && <CodeSettingInput setting={setting} onUpdate={onUpdate} />}
			{setting.type === 'action' && <ActionSettingInput setting={setting} onUpdate={onUpdate} didSectionChange={didSectionChange} />}
			{setting.type === 'asset' && <AssetSettingInput setting={setting} onUpdate={onUpdate} />}
			{setting.type === 'roomPick' && <RoomPickSettingInput setting={setting} onUpdate={onUpdate} />}

			{t.exists(setting.i18nDescription) && <div className='settings-description secondary-font-color'>
				<MarkdownText>{t(setting.i18nDescription)}</MarkdownText>
			</div>}

			{setting.alert && <div className='settings-alert pending-color pending-background pending-border'>
				<Icon icon='icon-attention' />
				<RawText>{t(setting.alert)}</RawText>
			</div>}
		</div>

		{hasResetButton && <Button aria-label={t('Reset')} data-setting={setting._id} cancel className='reset-setting'>
			<Icon icon='icon-ccw' className='color-error-contrast' />
		</Button>}
	</div>;
}

const useSettingsFormState = (groupId) => {
	const collection = usePrivateSettingsCollection();
	const formCollection = useMemo(() => new Mongo.Collection(null), []);

	const disabled = ({ blocked, enableQuery }) => {
		if (blocked) {
			return true;
		}

		if (!enableQuery) {
			return false;
		}

		const queries = [].concat(typeof enableQuery === 'string' ? JSON.parse(enableQuery) : enableQuery);

		return !queries.every((query) => !!formCollection.findOne(query));
	};

	useEffect(() => {
		collection.find().observe({
			added: (data) => {
				formCollection.insert({ ...data, disabled: disabled(data) });
			},
			changed: (data) => {
				formCollection.update(data._id, { ...data, disabled: disabled(data) });
			},
			removed: (data) => {
				formCollection.remove(data._id);
			},
		});
	}, []);

	const sections = useReactiveValue(() => Object.values(
		formCollection
			.find({ group: groupId }, { sort: { section: 1, sorter: 1, i18nLabel: 1 } })
			.fetch()
			.reduce((sections, setting) => {
				const name = setting.section || '';
				const changed = (sections[name] && sections[name].changed) || setting.changed;
				const settings = (sections[name] && sections[name].settings) || [];

				settings.push({ ...setting, disabled: disabled(setting) });

				return {
					...sections,
					[name]: {
						name,
						changed,
						settings,
					},
				};
			}, {})
	), [groupId]);

	const group = useReactiveValue(() => {
		const group = formCollection.findOne({ _id: groupId, type: 'group' });

		if (group) {
			group.changed = sections.some(({ changed }) => changed);
		}

		return group;
	}, [groupId, sections]);

	return [collection, formCollection, group, sections];
};

export function AnySettingsPage({ group: groupId }) {
	useAdminSidebar();

	const t = useTranslation();

	const hasPermission = useAtLeastOnePermission(['view-privileged-setting', 'edit-privileged-setting', 'manage-selected-settings']);
	const [collection, formCollection, group, sections] = useSettingsFormState(groupId);

	const onUpdateSetting = ({ _id }) => (update) => {
		const current = collection.findOne(_id);
		formCollection.update({ _id }, { $set: update(current) });
	};

	const sectionIsCustomOAuth = (sectionName) => sectionName && /^Custom OAuth:\s.+/.test(sectionName);

	const callbackURL = (sectionName) => {
		const id = s.strRight(sectionName, 'Custom OAuth: ').toLowerCase();
		return Meteor.absoluteUrl(`_oauth/${ id }`);
	};

	if (!group) {
		// TODO
		return null;
	}

	if (!hasPermission) {
		return <section className='page-container page-static page-settings'>
			<Header rawSectionName={t(group.i18nLabel)} />
			<div className='content'>
				<p>{t('You_are_not_authorized_to_view_this_page')}</p>
			</div>
		</section>;
	}

	return <SettingsContext.Provider value={{ collection, formCollection }}>
		<section className='page-container page-static page-settings'>
			<Header rawSectionName={t(group.i18nLabel)}>
				<Header.ButtonSection>
					{group.changed && <Button cancel className='discard'>{t('Cancel')}</Button>}
					<Button primary disabled={!group.changed} className='save'>{t('Save_changes')}</Button>
					{group._id === 'OAuth' && <>
					<Button secondary className='refresh-oauth'>{t('Refresh_oauth_services')}</Button>
					<Button secondary className='add-custom-oauth'>{t('Add_custom_oauth')}</Button>
				</>}
					{group._id === 'Assets' && <>
					<Button secondary className='refresh-clients'>{t('Apply_and_refresh_all_clients')}</Button>
				</>}
				</Header.ButtonSection>
			</Header>

			<div className='content'>
				{t.exists(group.i18nDescription) && <div className='info'>
					<p className='settings-description'>{t(group.i18nDescription)}</p>
				</div>}

				<div className='page-settings rocket-form'>
					{sections.map((section) => <SettingsGroupSectionPanel key={section.name} name={section.name} defaultCollapsed={!!section.name} help={sectionIsCustomOAuth(section.name) && <RawText>{t('Custom_oauth_helper', callbackURL(section.name))}</RawText>}>

						{section.settings.map((setting) => <SettingField key={setting._id} setting={setting} onUpdate={onUpdateSetting(setting)} didSectionChange={section.changed} />)}

						{group._id !== 'Assets' && <div className='input-line double-col'>
							<label className='setting-label'>{t('Reset_section_settings')}</label>
							<div className='setting-field'>
								<Button cancel data-section={section.name} className='reset-group'>
									{t('Reset')}
								</Button>
							</div>
						</div>}

						{group._id === 'OAuth' && sectionIsCustomOAuth(section.name) && <div className='submit'>
							<Button cancel className='remove-custom-oauth'>{t('Remove_custom_oauth')}</Button>
						</div>}
					</SettingsGroupSectionPanel>)}
				</div>
			</div>
		</section>
	</SettingsContext.Provider>;
}
