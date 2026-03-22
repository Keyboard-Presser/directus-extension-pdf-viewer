import InterfaceComponent from './interface.vue';

export default {
	id: 'pdf-viewer',
	name: 'PDF Viewer',
	icon: 'picture_as_pdf',
	description: 'Upload a PDF and preview it inline within the item view',
	component: InterfaceComponent,
	options: null,
	types: ['uuid', 'string'],
};
