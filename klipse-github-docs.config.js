;() => {
  const targetDefaults = {
    user: 'calmm-js',
    project: 'freer',
    icon: 'https://avatars1.githubusercontent.com/u/17234211',
    ga: 'UA-52808982-2',
    scripts: [
      'https://unpkg.com/babel-polyfill/dist/polyfill.min.js',
      'https://unpkg.com/infestines/dist/infestines.js',
      'freer.js',
      'https://unpkg.com/partial.lenses/dist/partial.lenses.js',
      'https://unpkg.com/ramda/dist/ramda.js',
      'setup.js'
    ]
  }

  return [
    Object.assign({}, targetDefaults, {
      source: 'README.md',
      target: 'index.html',
      title: 'Freer',
      stripComments: true,
      constToVar: false,
      menu: true,
      tooltips: true
    })
  ]
}
