import {registerArchiveAction} from './ArchiveContent';
import i18next from 'i18next';

export default async function () {
    await i18next.loadNamespaces('archive');

    registerArchiveAction();
}
