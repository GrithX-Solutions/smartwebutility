(() => {
  'use strict';

  const byId = id => document.getElementById(id);
  const type = byId('schemaType');
  const name = byId('schemaName');
  const nameLabel = byId('schemaNameLabel');
  const url = byId('schemaUrl');
  const desc = byId('schemaDescription');
  const image = byId('schemaImage');
  const output = byId('schemaOutput');
  const readiness = byId('schemaReadiness');
  const error = byId('schemaError');
  const status = byId('schemaStatus');

  const fields = {
    logo: byId('schemaLogo'),
    telephone: byId('schemaTelephone'),
    sameAs: byId('schemaSameAs'),
    alternateName: byId('schemaAlternateName'),
    applicationCategory: byId('schemaApplicationCategory'),
    operatingSystem: byId('schemaOperatingSystem'),
    price: byId('schemaPrice'),
    currency: byId('schemaCurrency'),
    ratingValue: byId('schemaRatingValue'),
    ratingCount: byId('schemaRatingCount'),
    authorName: byId('schemaAuthorName'),
    authorUrl: byId('schemaAuthorUrl'),
    datePublished: byId('schemaDatePublished'),
    dateModified: byId('schemaDateModified'),
    businessTelephone: byId('schemaBusinessTelephone'),
    street: byId('schemaStreet'),
    locality: byId('schemaLocality'),
    region: byId('schemaRegion'),
    postalCode: byId('schemaPostalCode'),
    country: byId('schemaCountry'),
    priceRange: byId('schemaPriceRange')
  };

  const year = byId('year');
  if (year) year.textContent = new Date().getFullYear();

  const groups = [...document.querySelectorAll('[data-schema-fields]')];

  const trim = element => element.value.trim();

  const setStatus = (message, kind='neutral') => {
    status.textContent = message;
    status.dataset.kind = kind;
  };

  const clearError = () => {
    error.hidden = true;
    error.textContent = '';
  };

  const fail = message => {
    output.value = '';
    readiness.textContent = 'Fix the invalid input before copying markup.';
    error.textContent = message;
    error.hidden = false;
    setStatus('Fix input', 'error');
  };

  function absoluteHttpUrl(value, label) {
    if (!value) return '';
    let parsed;
    try {
      parsed = new URL(value);
    } catch {
      throw new Error(label + ' must be a fully qualified URL.');
    }
    if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) {
      throw new Error(label + ' must use an absolute HTTP(S) URL.');
    }
    return value;
  }

  function urlLines(value, label) {
    const items = value.split(/\r?\n/).map(item => item.trim()).filter(Boolean);
    return items.map(item => absoluteHttpUrl(item, label));
  }

  function optionalIsoDate(value, label) {
    if (!value) return '';
    if (Number.isNaN(Date.parse(value))) {
      throw new Error(label + ' must be a valid ISO-style date or date-time.');
    }
    return value;
  }

  function baseObject(schemaType) {
    const obj = {
      '@context': 'https://schema.org',
      '@type': schemaType
    };

    const entityName = trim(name);
    const entityUrl = absoluteHttpUrl(trim(url), 'URL');
    const entityImage = absoluteHttpUrl(trim(image), 'Image URL');

    if (entityName) {
      if (schemaType === 'Article') obj.headline = entityName;
      else obj.name = entityName;
    }
    if (entityUrl) obj.url = entityUrl;
    if (trim(desc)) obj.description = trim(desc);
    if (entityImage) obj.image = entityImage;

    return obj;
  }

  function addOrganization(obj) {
    const logo = absoluteHttpUrl(trim(fields.logo), 'Logo URL');
    const sameAs = urlLines(fields.sameAs.value, 'SameAs URL');
    if (logo) obj.logo = logo;
    if (trim(fields.telephone)) obj.telephone = trim(fields.telephone);
    if (sameAs.length) obj.sameAs = sameAs;
  }

  function addWebsite(obj) {
    if (trim(fields.alternateName)) obj.alternateName = trim(fields.alternateName);
  }

  function addSoftware(obj) {
    const priceRaw = trim(fields.price);
    const ratingRaw = trim(fields.ratingValue);
    const countRaw = trim(fields.ratingCount);

    if (trim(fields.applicationCategory)) obj.applicationCategory = trim(fields.applicationCategory);
    if (trim(fields.operatingSystem)) obj.operatingSystem = trim(fields.operatingSystem);

    if (priceRaw) {
      const price = Number(priceRaw);
      if (!Number.isFinite(price) || price < 0) {
        throw new Error('Offer price must be a non-negative number.');
      }
      obj.offers = {
        '@type': 'Offer',
        price
      };
      if (price > 0 && trim(fields.currency)) {
        if (!/^[A-Za-z]{3}$/.test(trim(fields.currency))) {
          throw new Error('Currency must be a three-letter code such as USD.');
        }
        obj.offers.priceCurrency = trim(fields.currency).toUpperCase();
      }
    }

    if (ratingRaw || countRaw) {
      const rating = Number(ratingRaw);
      const count = Number(countRaw);
      if (!ratingRaw || !countRaw) {
        throw new Error('Aggregate rating requires both rating value and rating count.');
      }
      if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
        throw new Error('Aggregate rating must be between 1 and 5.');
      }
      if (!Number.isInteger(count) || count < 1) {
        throw new Error('Rating count must be a positive whole number.');
      }
      obj.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: rating,
        ratingCount: count,
        bestRating: 5,
        worstRating: 1
      };
    }
  }

  function addArticle(obj) {
    const authorUrl = absoluteHttpUrl(trim(fields.authorUrl), 'Author URL');
    const datePublished = optionalIsoDate(trim(fields.datePublished), 'Date published');
    const dateModified = optionalIsoDate(trim(fields.dateModified), 'Date modified');

    if (trim(fields.authorName) || authorUrl) {
      obj.author = {'@type': 'Person'};
      if (trim(fields.authorName)) obj.author.name = trim(fields.authorName);
      if (authorUrl) obj.author.url = authorUrl;
    }
    if (datePublished) obj.datePublished = datePublished;
    if (dateModified) obj.dateModified = dateModified;
  }

  function addLocalBusiness(obj) {
    const addressValues = {
      streetAddress: trim(fields.street),
      addressLocality: trim(fields.locality),
      addressRegion: trim(fields.region),
      postalCode: trim(fields.postalCode),
      addressCountry: trim(fields.country)
    };

    if (Object.values(addressValues).some(Boolean)) {
      obj.address = {'@type': 'PostalAddress'};
      for (const [key, value] of Object.entries(addressValues)) {
        if (value) obj.address[key] = value;
      }
    }
    if (trim(fields.businessTelephone)) obj.telephone = trim(fields.businessTelephone);
    if (trim(fields.priceRange)) obj.priceRange = trim(fields.priceRange);
  }

  function readinessMessage(schemaType, obj) {
    const notes = [];

    if (schemaType === 'Organization') {
      notes.push(obj.name ? 'Organization name included.' : 'Add the organization name if it is visible and stable.');
      notes.push(obj.url ? 'Entity URL included.' : 'Add the organization URL when applicable.');
      return notes.join(' ');
    }

    if (schemaType === 'WebSite') {
      notes.push(obj.name ? 'WebSite name included.' : 'Add the public site name.');
      notes.push(obj.url ? 'WebSite URL included.' : 'Add the canonical site URL.');
      return notes.join(' ');
    }

    if (schemaType === 'Article') {
      notes.push('Google currently lists no required Article properties, but recommends descriptive properties that apply.');
      if (!obj.headline) notes.push('Add a headline.');
      if (!obj.author?.name) notes.push('Add the real author name when applicable.');
      if (!obj.datePublished) notes.push('Add datePublished when it is visible on the page.');
      if (!obj.image) notes.push('Add a representative crawlable image when applicable.');
      return notes.join(' ');
    }

    if (schemaType === 'LocalBusiness') {
      const missing = [];
      if (!obj.name) missing.push('name');
      if (!obj.address) missing.push('address');
      if (missing.length) {
        return 'Google LocalBusiness rich-result documentation requires ' + missing.join(' and ') + '. Add real visible business data before treating this as feature-ready.';
      }
      const address = obj.address;
      const missingAddress = ['streetAddress','addressLocality','addressRegion','postalCode','addressCountry'].filter(key => !address[key]);
      return missingAddress.length
        ? 'Required LocalBusiness name/address are present, but complete the address when applicable: missing ' + missingAddress.join(', ') + '.'
        : 'LocalBusiness name and a detailed PostalAddress are present. Validate the final markup and use the most specific LocalBusiness subtype that accurately applies.';
    }

    if (schemaType === 'SoftwareApplication') {
      const missing = [];
      if (!obj.name) missing.push('name');
      if (!obj.offers || typeof obj.offers.price !== 'number') missing.push('offers.price');
      if (!obj.aggregateRating) missing.push('aggregateRating or review');
      if (missing.length) {
        return 'Google SoftwareApplication rich-result documentation requires ' + missing.join(', ') + '. Never invent rating or review data.';
      }
      return 'The supported SoftwareApplication required fields covered by this form are present. Validate the final page and markup before deployment.';
    }

    return 'Validate the final JSON-LD against Schema.org and any Google feature you intend to target.';
  }

  function syncTypeUi() {
    const selected = type.value;
    groups.forEach(group => {
      group.hidden = group.dataset.schemaFields !== selected;
    });

    const labels = {
      Organization: 'Organization name',
      WebSite: 'Site name',
      SoftwareApplication: 'Application name',
      Article: 'Article headline',
      LocalBusiness: 'Business name'
    };
    nameLabel.textContent = labels[selected] || 'Name';
  }

  function build() {
    clearError();
    syncTypeUi();

    try {
      const schemaType = type.value;
      const obj = baseObject(schemaType);

      if (schemaType === 'Organization') addOrganization(obj);
      else if (schemaType === 'WebSite') addWebsite(obj);
      else if (schemaType === 'SoftwareApplication') addSoftware(obj);
      else if (schemaType === 'Article') addArticle(obj);
      else if (schemaType === 'LocalBusiness') addLocalBusiness(obj);

      output.value = '<script type="application/ld+json">\n'
        + JSON.stringify(obj, null, 2)
        + '\n<\/script>';
      readiness.textContent = readinessMessage(schemaType, obj);
      setStatus('Generated · ' + schemaType, 'success');
    } catch (caught) {
      fail(caught?.message || 'Could not generate schema markup.');
    }
  }

  const allInputs = [
    type, name, url, desc, image,
    ...Object.values(fields)
  ];

  allInputs.forEach(element => {
    element.addEventListener(element.tagName === 'SELECT' ? 'change' : 'input', build);
  });

  byId('copySchema').addEventListener('click', async event => {
    if (!output.value || !error.hidden) return;
    await navigator.clipboard.writeText(output.value);
    const button = event.currentTarget;
    const old = button.textContent;
    button.textContent = 'Copied';
    setTimeout(() => button.textContent = old, 1200);
  });

  byId('exampleSchema').addEventListener('click', () => {
    type.value = 'LocalBusiness';
    name.value = 'Example Books';
    url.value = 'https://example.com/locations/downtown';
    desc.value = 'Independent bookstore serving downtown readers.';
    image.value = 'https://example.com/images/store.jpg';
    fields.businessTelephone.value = '+1-555-555-0100';
    fields.street.value = '148 W 51st St';
    fields.locality.value = 'New York';
    fields.region.value = 'NY';
    fields.postalCode.value = '10019';
    fields.country.value = 'US';
    fields.priceRange.value = '$$';
    build();
  });

  byId('clearSchema').addEventListener('click', () => {
    type.value = 'Organization';
    [name, url, desc, image, ...Object.values(fields)].forEach(element => {
      if (element.tagName === 'SELECT') element.value = '';
      else element.value = '';
    });
    syncTypeUi();
    build();
    name.focus();
  });

  syncTypeUi();
  build();
})();
