const translations = {
	es: {
		seo: {
			title: 'Daniel Segovia | CTO y Líder de Tecnología',
			description: 'Daniel Segovia, Chief Technology Officer con más de 24 años de experiencia en desarrollo de software, arquitectura, liderazgo tecnológico y productos digitales.',
			keywords: 'Daniel Segovia, CTO, Chief Technology Officer, liderazgo tecnológico, arquitectura de software, desarrollo de software, tecnología, productos digitales',
			locale: 'es_AR'
		},
		about: {
			title: '¿Quién soy?',
			description: 'Soy un profesional de tecnología con más de 24 años de trayectoria ininterrumpida en desarrollo de software, arquitectura y liderazgo de productos digitales. A lo largo de mi carrera trabajé en distintas compañías e industrias, participando en múltiples etapas del ciclo de vida de un producto: desde la definición técnica y la construcción de soluciones hasta la evolución de plataformas, equipos y procesos. <br />Desde hace más de 8 años lidero equipos de tecnología, alineando estrategia técnica con objetivos de negocio, impulsando buenas prácticas de ingeniería y acompañando el crecimiento profesional de las personas. Actualmente me desempeño como Chief Technology Officer en <a href="https://terrand.app" target="_blank" rel="noopener noreferrer">Terrand</a>, donde trabajo en la construcción de una visión tecnológica escalable, sostenible y orientada a resultados. <br />En mi paso por la educación dicté clases en Images Campus, Acámica y Digital House, y fui director de las carreras Desarrollo Web Full Stack y Desarrollo Web Back End.'
		},
		career: {
			imageAlt: 'mi carrera en el mundo IT'
		},
		profile: {
			imageAlt: 'Daniel Segovia, Chief Technology Officer'
		},
		social: {
			linkedin: 'Enlace a Linkedin',
			instagram: 'Enlace a Instagram',
			tiktok: 'Enlace a Tiktok',
			youtube: 'Enlace a Youtube',
			email: 'Enlace a enviarme un correo'
		}
	},
	en: {
		seo: {
			title: 'Daniel Segovia | CTO and Technology Leader',
			description: 'Daniel Segovia, Chief Technology Officer with more than 24 years of experience in software development, architecture, technology leadership, and digital products.',
			keywords: 'Daniel Segovia, CTO, Chief Technology Officer, technology leadership, software architecture, software development, digital products, engineering leadership',
			locale: 'en_US'
		},
		about: {
			title: 'Who am I?',
			description: 'I am a technology professional with more than 24 years of uninterrupted experience in software development, architecture, and digital product leadership. Throughout my career, I have worked across companies and industries, contributing to multiple stages of the product lifecycle: from technical definition and solution delivery to the evolution of platforms, teams, and processes. <br />For more than 8 years, I have led technology teams, aligning technical strategy with business goals, driving engineering best practices, and supporting people&apos;s professional growth. I currently serve as Chief Technology Officer at <a href="https://terrand.app" target="_blank" rel="noopener noreferrer">Terrand</a>, where I work on building a scalable, sustainable, results-oriented technology vision. <br />During my time in education, I taught at Images Campus, Acámica, and Digital House, and served as director of the Full Stack Web Development and Back End Web Development programs.'
		},
		career: {
			imageAlt: 'my career in the IT industry'
		},
		profile: {
			imageAlt: 'Daniel Segovia, Chief Technology Officer'
		},
		social: {
			linkedin: 'Link to Linkedin',
			instagram: 'Link to Instagram',
			tiktok: 'Link to Tiktok',
			youtube: 'Link to Youtube',
			email: 'Link to send me an email'
		}
	}
};

const getTranslation = (language, key) => key.split('.').reduce((value, part) => value && value[part], translations[language]);

const setMeta = (selector, attribute, value) => {
	const element = document.querySelector(selector);
	if (element) {
		element.setAttribute(attribute, value);
	}
};

const updateStructuredData = (labels) => {
	const structuredData = document.getElementById('structured-data');
	if (!structuredData) {
		return;
	}

	const data = JSON.parse(structuredData.textContent);
	data.url = window.location.origin + window.location.pathname;
	data.description = labels.seo.description;
	structuredData.textContent = JSON.stringify(data, null, 2);
};

const setLanguage = (language, options = {}) => {
	const selectedLanguage = translations[language] ? language : 'en';
	const shouldUpdateUrl = Boolean(options.updateUrl);
	const labels = translations[selectedLanguage];
	document.documentElement.lang = selectedLanguage;
	document.title = labels.seo.title;

	document.querySelectorAll('[data-i18n]').forEach((element) => {
		element.textContent = getTranslation(selectedLanguage, element.dataset.i18n);
	});

	document.querySelectorAll('[data-i18n-html]').forEach((element) => {
		element.innerHTML = getTranslation(selectedLanguage, element.dataset.i18nHtml);
	});

	document.querySelectorAll('[data-i18n-attr]').forEach((element) => {
		element.dataset.i18nAttr.split(',').forEach((item) => {
			const [attribute, key] = item.split(':');
			element.setAttribute(attribute, getTranslation(selectedLanguage, key));
		});
	});

	document.querySelectorAll('[data-language]').forEach((button) => {
		const isActive = button.dataset.language === selectedLanguage;
		button.classList.toggle('is-active', isActive);
		button.setAttribute('aria-pressed', String(isActive));
	});

	setMeta('meta[name="description"]', 'content', labels.seo.description);
	setMeta('meta[name="keywords"]', 'content', labels.seo.keywords);
	setMeta('meta[property="og:title"]', 'content', labels.seo.title);
	setMeta('meta[property="og:description"]', 'content', labels.seo.description);
	setMeta('meta[property="og:image:alt"]', 'content', labels.profile.imageAlt);
	setMeta('meta[property="og:locale"]', 'content', labels.seo.locale);
	setMeta('meta[name="twitter:title"]', 'content', labels.seo.title);
	setMeta('meta[name="twitter:description"]', 'content', labels.seo.description);
	setMeta('meta[name="twitter:image:alt"]', 'content', labels.profile.imageAlt);

	const currentUrl = new URL(window.location.href);
	if (shouldUpdateUrl) {
		if (selectedLanguage === 'en') {
			currentUrl.searchParams.delete('lang');
		} else {
			currentUrl.searchParams.set('lang', selectedLanguage);
		}

		window.history.replaceState({}, '', currentUrl);
	}

	setMeta('link[rel="canonical"]', 'href', currentUrl.href);
	setMeta('meta[property="og:url"]', 'content', currentUrl.href);
	updateStructuredData(labels);
};

document.querySelectorAll('[data-language]').forEach((button) => {
	button.addEventListener('click', () => setLanguage(button.dataset.language, { updateUrl: true }));
});

const params = new URLSearchParams(window.location.search);
setLanguage(params.get('lang') || 'en');
