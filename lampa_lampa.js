(function () {
    'use strict';

    const PLUGIN_NAME = 'Лампа';
    const PLUGIN_ID = 'lampa_lampa';
    const VERSION = '1.6.1';

    const SOURCES = [
        { title: 'Фільмікс', value: 'filmix' },
        { title: 'Резка',    value: 'rezka' },
        { title: 'Юафлікс',  value: 'uaflix' },
        { title: 'Юакіно',   value: 'youkino' }
    ];

    function getSourceName(key) {
        const found = SOURCES.find(s => s.value === key);
        return found ? found.title : 'Фільмікс';
    }

    // ====================== API ====================
    class FilmixApi   { static getMovies() { return fetch('https://filmix.ru/api/movies?limit=12&source=filmix').then(r => r.json()); } }
    class RezkaApi    { static getMovies() { return fetch('https://rezka.ag/api/movies?limit=12&source=rezka').then(r => r.json()); } }
    class UAFlixApi   { static getMovies() { return fetch('https://uaflix.net/api/movies?limit=12&source=uaflix').then(r => r.json()); } }
    class YouKinoApi  { static getMovies() { return fetch('https://youkino.net/api/movies?limit=12&source=youkino').then(r => r.json()); } }

    class FilmRepository {
        static getMovies(source, type) {
            switch (source) {
                case 'filmix': return FilmixApi.getMovies();
                case 'rezka':  return RezkaApi.getMovies();
                case 'uaflix': return UAFlixApi.getMovies();
                case 'youkino':return YouKinoApi.getMovies();
                default:       return FilmixApi.getMovies();
            }
        }
    }

    // ====================== Головна сторінка ====================
    const HomeActivity = {
        render: function (source) {
            const sections = [
                { title: 'Нові фільми', type: 'movies' },
                { title: 'Популярні', type: 'movies' },
                { title: 'Нові серіали', type: 'movies' }
            ];

            const container = $(`
                <div class="home-grid">
                    ${sections.map((sec, i) => `
                        <div class="section" style="margin-bottom: 30px;">
                            <div class="section-header">
                                <span class="section-title">${sec.title}</span>
                                <span class="section-more">Більше</span>
                            </div>
                            <div class="grid" id="grid-${i}"></div>
                        </div>
                    `).join('')}
                </div>
            `);

            sections.forEach((sec, i) => {
                setTimeout(() => {
                    const grid = container.find(`#grid-${i}`);
                    grid.addClass('loading');

                    FilmRepository.getMovies(source, sec.type).then(movies => {
                        grid.removeClass('loading').html(
                            movies.map(movie => `
                                <div class="card">
                                    <img src="${movie.poster || 'https://picsum.photos/200'}" alt="${movie.title}">
                                    <div class="card-info">
                                        <h4>${movie.title}</h4>
                                        <div class="rating">⭐ ${movie.rating || '7.5'}</div>
                                        <p>${movie.shortDesc || ''}</p>
                                    </div>
                                </div>
                            `).join('')
                        );
                    }).catch(() => {
                        grid.removeClass('loading').html('<p>Помилка завантаження</p>');
                    });
                }, i * 300);
            });

            return container;
        }
    };

    // ====================== ПЛАГІН ====================
    function initPlugin() {
        if (window.lampa_lampa_inited) return;
        window.lampa_lampa_inited = true;

        // 0. Реєстрація у списку плагінів Lampa
        if (window.Lampa && Lampa.Plugins) {
            Lampa.Plugins.add({
                name: PLUGIN_NAME,
                version: VERSION,
                description: 'Плагін «Лампа» з вибором джерел',
                type: 'interface'
            });
        }

        // === 1. Створення окремого розділу в меню «Налаштування» ===
        Lampa.Settings.addComponent({
            component: PLUGIN_ID,
            name: PLUGIN_NAME,
            icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line></svg>'
        });

        // Додавання параметру вибору джерела в новий розділ
        Lampa.SettingsApi.addParam({
            component: PLUGIN_ID,
            param: {
                name: 'lampa_default_source',
                type: 'select',
                values: {
                    filmix: 'Фільмікс',
                    rezka: 'Резка',
                    uaflix: 'Юафлікс',
                    youkino: 'Юакіно'
                },
                default: 'filmix'
            },
            field: {
                name: 'Основні джерела',
                description: 'Оберіть джерело контенту за замовчуванням'
            },
            onChange: function (value) {
                Lampa.Noty.show('Джерело змінено на: ' + getSourceName(value));
                updateHomeCards(value);
            }
        });

        // Додавання параметру режиму світіння в налаштування
        Lampa.SettingsApi.addParam({
            component: PLUGIN_ID,
            param: {
                name: 'lampa_lamp_mode',
                type: 'select',
                values: {
                    yellow: 'Жовтий',
                    red: 'Червоний',
                    green: 'Зелений'
                },
                default: 'yellow'
            },
            field: {
                name: 'Колір підсвічування',
                description: 'Ефект світіння лампи'
            },
            onChange: function (value) {
                applyLampMode(value);
            }
        });

        // === 2. Кнопки у повному вікні картки ===
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'complite') {
                const render = e.object.activity.render();
                const currentLamp = Lampa.Storage.get('lampa_lamp_mode', 'yellow');
                const currentSource = Lampa.Storage.get('lampa_default_source', 'filmix');

                // Кнопка Лампа
                const lampButton = $(`
                    <div class="full-start__button selector lamp-button button--lamp">
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="2" x2="12" y2="6"></line>
                            <line x1="12" y1="18" x2="12" y2="22"></line>
                            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                            <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                            <line x1="2" y1="12" x2="6" y2="12"></line>
                            <line x1="18" y1="12" x2="22" y2="12"></line>
                        </svg>
                        <span>Лампа: ${currentLamp.toUpperCase()}</span>
                    </div>
                `);

                lampButton.on('hover:enter', function () {
                    toggleLamp(currentLamp, function (newMode) {
                        Lampa.Storage.set('lampa_lamp_mode', newMode);
                        updateLampButton(lampButton, newMode);
                    });
                });

                // Кнопка Джерело
                const sourceButton = $(`
                    <div class="full-start__button selector button--source-switch">
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="2" x2="12" y2="6"></line>
                            <line x1="12" y1="18" x2="12" y2="22"></line>
                            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                            <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                            <line x1="2" y1="12" x2="6" y2="12"></line>
                            <line x1="18" y1="12" x2="22" y2="12"></line>
                        </svg>
                        <span>Джерело: ${getSourceName(currentSource)}</span>
                    </div>
                `);

                sourceButton.on('hover:enter', function () {
                    openSourceModal(function (selectedSource) {
                        Lampa.Storage.set('lampa_default_source', selectedSource);
                        sourceButton.find('span').text('Джерело: ' + getSourceName(selectedSource));
                        Lampa.Noty.show('Джерело змінено на: ' + getSourceName(selectedSource));
                        updateHomeCards(selectedSource);
                    });
                });

                render.find('.full-start__buttons').append(lampButton).append(sourceButton);
                updateLampButton(lampButton, currentLamp);
            }
        });

        // ====================== ДОПОМІЖНІ ФУНКЦІЇ ======================
        function updateHomeCards(source) {
            const home = Lampa.Activity.active();
            if (!home || home.name !== 'home') return;
            const render = home.render();
            render.find('.home-grid').remove();
            render.append(HomeActivity.render(source));
        }

        function openSourceModal(callback) {
            const activeSource = Lampa.Storage.get('lampa_default_source', 'filmix');
            const items = SOURCES.map(s => ({
                title: s.title + (s.value === activeSource ? ' ✓' : ''),
                source: s.value
            }));

            Lampa.Select.show({
                title: 'Оберіть джерело',
                items: items,
                onSelect: function (item) { if (callback) callback(item.source); },
                onBack: function () { Lampa.Controller.toggle('content'); }
            });
        }

        function applyLampMode(mode) {
            document.body.style.boxShadow = mode === 'yellow' 
                ? 'inset 0 0 80px 40px rgba(255, 255, 0, 0.6)' 
                : mode === 'red' 
                    ? 'inset 0 0 80px 40px rgba(255, 0, 0, 0.5)' 
                    : 'inset 0 0 80px 40px rgba(0, 255, 0, 0.5)';
        }

        function toggleLamp(current, callback) {
            const modes = ['yellow', 'red', 'green'];
            const nextIndex = (modes.indexOf(current) + 1) % modes.length;
            const newMode = modes[nextIndex];

            applyLampMode(newMode);
            Lampa.Noty.show(`Лампа: ${newMode.toUpperCase()}`);
            if (callback) callback(newMode);
        }

        function updateLampButton(btn, mode) {
            btn.find('span').text(`Лампа: ${mode.toUpperCase()}`);
        }

        console.log(`[${PLUGIN_NAME}] v${VERSION} — успішно ініціалізовано!`);
    }

    if (window.app_ready) {
        initPlugin();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') initPlugin();
        });
    }
})();
