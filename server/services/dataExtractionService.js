class DataExtractionService {
  constructor() {
    this.deepseekApiKey = null; // DISABLED to avoid costs until quality leads found
    this.apiCallCount = 0;
    this.maxTokensPerRequest = 4000; // Conservative limit for cost control
    this.extractionCache = new Map(); // Cache for similar content

    console.log('🚫 DEEPSEEK AI DISABLED in DataExtractionService to avoid unnecessary costs');

    // Common patterns for different types of data
    this.patterns = {
      company: [
        /(?:by|from|announced by|developed by|launched by|constructed by)\s+([A-Z][a-zA-Z\s&.,]+?)(?:\s|$|,|\.)/i,
        /([A-Z][a-zA-Z\s&.,]+?)\s+(?:announced|launched|developed|constructed|expanded|opened)/i,
        /(?:company|organization|firm|inc|llc|corp|corporation)\s*[:\-]?\s*([A-Z][A-Za-z\s&.,]+)/i
      ],
      
      location: [
        /(?:in|at|near|within|located in)\s+([A-Z][a-zA-Z\s,]+?)(?:\s|$|,|\.)/i,
        /([A-Z][a-zA-Z\s,]+?)\s+(?:area|district|region|city|county|state|neighborhood)/i,
        /(?:downtown|uptown|midtown|historic district|business district)\s+([A-Z][a-zA-Z\s,]+)/i
      ],
      
      projectType: [
        'hotel', 'resort', 'apartment', 'condominium', 'condo', 'office', 'retail', 'industrial',
        'warehouse', 'restaurant', 'entertainment', 'healthcare', 'education', 'residential',
        'mixed-use', 'commercial', 'residential', 'hospitality', 'tourism', 'infrastructure'
      ],
      
      budget: [
        /(?:budget|cost|investment|price|amount|value)\s*(?:of|:)?\s*[\$]?(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:k|K|m|M|b|B|thousand|million|billion)?/i,
        /[\$](\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:k|K|m|M|b|B|thousand|million|billion)/i,
        /(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:k|K|m|M|b|B|thousand|million|billion)\s*(?:dollars?|USD)/i
      ],
      
      timeline: [
        /(?:completes?|finishes?|opens?|launches?|delivers?)\s+(?:in|by|during|by the end of)\s+(\d{4})/i,
        /(?:expected|scheduled|planned|target)\s+(?:completion|opening|launch|delivery)\s+(?:in|by|during)\s+(\d{4})/i,
        /(\d{4})\s+(?:completion|opening|launch|deadline|target date)/i,
        /(?:Q[1-4]|quarter)\s+(\d{4})/i
      ],
      
      roomCount: [
        /(\d+)\s*(?:rooms?|suites?|units?|apartments?|guest rooms?)/i,
        /(?:rooms?|suites?|units?|apartments?|guest rooms?)\s*:?\s*(\d+)/i,
        /(?:capacity|accommodates?)\s*(?:up to\s*)?(\d+)\s*(?:guests?|visitors?)/i
      ],
      
      squareFootage: [
        /(\d+(?:,\d{3})*)\s*(?:sq\s*ft|square\s*feet|square\s*foot|ft²)/i,
        /(?:sq\s*ft|square\s*feet|square\s*foot|ft²)\s*:?\s*(\d+(?:,\d{3})*)/i,
        /(\d+(?:,\d{3})*)\s*(?:square\s*)?meters?/i
      ],
      
      employees: [
        /(\d+(?:,\d{3})*)\s*(?:employees?|staff|workers?|jobs?)/i,
        /(?:employees?|staff|workers?|jobs?)\s*:?\s*(\d+(?:,\d{3})*)/i,
        /(?:creates?|generates?)\s*(\d+(?:,\d{3})*)\s*(?:new\s*)?(?:jobs?|positions?)/i
      ]
    };
  }

  extractCompanyFromText(text) {
    if (!text) return "Unknown";

    // Ultra-enhanced company extraction with multiple strategies
    const enhancedPatterns = [
      // Direct company announcements
      /([A-Z][a-zA-Z\s&.,]+?)\s+(?:announces|launches|develops|constructs|expands|opens|plans|proposes|unveils|reveals)/i,
      /(?:announced by|developed by|constructed by|launched by|planned by|proposed by)\s+([A-Z][a-zA-Z\s&.,]+?)(?:\s|$|,|\.)/i,

      // Company followed by business terms
      /([A-Z][a-zA-Z\s&.,]+?)\s+(?:Inc|LLC|Corp|Corporation|Group|Holdings|Enterprises|Partners|Associates|Company|Ltd|Limited)/i,
      /([A-Z][a-zA-Z\s&.,]+?)\s+(?:hotel|resort|apartment|office|building|complex|development|project|property|real estate)/i,

      // Quoted or parenthetical company names
      /["']([A-Z][a-zA-Z\s&.,]+?)["']/,
      /\(([A-Z][a-zA-Z\s&.,]+?)\)/,

      // Company name with "the" prefix
      /(?:the\s+)([A-Z][a-zA-Z\s&.,]+?)\s+(?:company|group|corporation|inc|llc)/i,

      // Real estate development companies
      /([A-Z][a-zA-Z\s&.,]+?)\s+(?:Realty|Properties|Developers|Construction|Builders|Hospitality)/i,

      // Original patterns
      ...this.patterns.company
    ];

    for (const pattern of enhancedPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const company = match[1].trim();

        // Enhanced cleaning and validation
        let cleaned = company
          .replace(/^(the\s+|a\s+|an\s+)/i, '') // Remove articles
          .replace(/[.,;]$/, '') // Remove trailing punctuation
          .replace(/\s+/g, ' ') // Normalize spaces
          .trim();

        // Validate company name quality
        if (this.isValidCompanyName(cleaned)) {
          return cleaned;
        }
      }
    }

    // Try named entity extraction from title
    const titleWords = text.split(/\s+/);
    const potentialCompanies = [];

    for (let i = 0; i < Math.min(5, titleWords.length); i++) {
      const word = titleWords[i];

      // Look for capitalized words that could be company names
      if (word.match(/^[A-Z][a-zA-Z]+$/) && word.length > 3) {
        // Check if it's followed by company indicators
        const nextWords = titleWords.slice(i + 1, i + 3).join(' ').toLowerCase();
        if (nextWords.includes('announces') || nextWords.includes('develops') ||
            nextWords.includes('launches') || nextWords.includes('opens')) {
          potentialCompanies.push(word);
        }
      }
    }

    if (potentialCompanies.length > 0) {
      return potentialCompanies[0];
    }

    return "Unknown";
  }

  isValidCompanyName(name) {
    if (!name || name.length < 2 || name.length > 60) return false;

    // Reject if it's just a common word
    const commonWords = ['the', 'and', 'for', 'with', 'new', 'old', 'big', 'small', 'first', 'last'];
    if (commonWords.includes(name.toLowerCase())) return false;

    // Reject if it contains only numbers
    if (/^\d+$/.test(name)) return false;

    // Reject if it looks like a date or number
    if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$|^\d{4}$|^\$\d+/.test(name)) return false;

    // Reject location-like names without company context
    const locationWords = ['downtown', 'uptown', 'midtown', 'north', 'south', 'east', 'west', 'central'];
    if (locationWords.includes(name.toLowerCase())) return false;

    return true;
  }

  extractLocationFromText(text) {
    if (!text) return "Unknown";

    // Ultra-enhanced location extraction patterns
    const enhancedPatterns = [
      // Location followed by project type
      /([A-Z][a-zA-Z\s,]+?)\s+(?:hotel|resort|apartment|office|building|complex|development|project)/i,
      // Project type in location
      /(?:hotel|resort|apartment|office|building|complex|development|project)\s+(?:in|at|near|within|located in)\s+([A-Z][a-zA-Z\s,]+?)(?:\s|$|,|\.)/i,
      // Common city/state patterns
      /([A-Z][a-zA-Z\s]+?),\s*([A-Z]{2})/i, // City, State
      /([A-Z][a-zA-Z\s]+?)\s+(?:County|City|District|Area|Region|Borough)/i,
      // Address patterns
      /(\d+)\s+([A-Z][a-zA-Z\s]+?)\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Place|Pl|Court|Ct)/i,
      // Neighborhood/district patterns
      /(?:downtown|uptown|midtown|historic district|business district|financial district)\s+([A-Z][a-zA-Z\s,]+)/i,
      // Original patterns
      ...this.patterns.location
    ];

    for (const pattern of enhancedPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const location = match[1].trim();
        // Clean up common artifacts and validate
        const cleaned = location.replace(/[.,]$/, '').replace(/\s+/g, ' ').trim();
        if (this.isValidLocation(cleaned)) {
          return cleaned;
        }
      }
    }

    // Try to extract from title if it looks like a location
    const words = text.split(/\s+/);
    for (let i = 0; i < Math.min(5, words.length); i++) {
      const word = words[i];
      if (word.match(/^[A-Z][a-z]+$/) && word.length > 3) {
        // Check if it's not already identified as a company
        const context = words.slice(i - 2, i + 3).join(' ').toLowerCase();
        if (!context.includes('announces') && !context.includes('develops') && !context.includes('launches')) {
          return word;
        }
      }
    }

    return "Unknown";
  }

  isValidLocation(location) {
    if (!location || location.length < 2 || location.length > 60) return false;

    // Reject if it's just a common word
    const commonWords = ['the', 'and', 'for', 'with', 'new', 'old', 'big', 'small'];
    if (commonWords.includes(location.toLowerCase())) return false;

    // Reject if it contains only numbers
    if (/^\d+$/.test(location)) return false;

    return true;
  }

  /**
   * Extract contact information from text
   */
  extractContactsFromText(text, maxContacts = 3) {
    if (!text) return [];

    const contacts = [];
    const contactPatterns = [
      // Email patterns
      /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,

      // Phone patterns (various formats)
      /(\+?1?[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g,
      /([0-9]{3})[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g,

      // Name patterns (look for names near contact info)
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+?)(?:\s*,?\s*(?:CEO|CTO|CFO|President|Director|Manager|VP|Vice President|Contact))/gi
    ];

    // Extract emails
    const emails = [];
    const emailMatches = text.match(contactPatterns[0]) || [];
    emailMatches.forEach(email => {
      if (!emails.includes(email.toLowerCase())) {
        emails.push(email.toLowerCase());
      }
    });

    // Extract phones
    const phones = [];
    contactPatterns.slice(1, 3).forEach(pattern => {
      const matches = text.match(pattern) || [];
      matches.forEach(phone => {
        const cleanPhone = phone.replace(/[^\d]/g, '');
        if (cleanPhone.length >= 10 && !phones.includes(cleanPhone)) {
          phones.push(cleanPhone);
        }
      });
    });

    // Extract names
    const names = [];
    const nameMatches = text.match(contactPatterns[3]) || [];
    nameMatches.forEach(name => {
      if (!names.includes(name.trim())) {
        names.push(name.trim());
      }
    });

    // Create contact objects by intelligently matching names, emails, and phones
    const maxContactsFound = Math.max(emails.length, phones.length, names.length);

    for (let i = 0; i < Math.min(maxContactsFound, maxContacts); i++) {
      const contact = {
        name: names[i] || this.extractNameNearContact(text, emails[i], phones[i]),
        email: emails[i],
        phone: phones[i] ? this.formatPhoneNumber(phones[i]) : undefined,
        title: this.extractTitleFromContext(text, names[i]),
        company: this.extractCompanyFromText(text),
        confidence: this.calculateContactConfidence({
          name: names[i] || emails[i] || phones[i],
          email: emails[i],
          phone: phones[i]
        })
      };

      if (contact.name || contact.email || contact.phone) {
        contacts.push(contact);
      }
    }

    return contacts;
  }

  extractNameNearContact(text, email, phone) {
    if (!email && !phone) return undefined;

    const searchText = email || phone;
    const index = text.indexOf(searchText);

    if (index === -1) return undefined;

    // Look for name in the 100 characters before the contact info
    const contextStart = Math.max(0, index - 100);
    const context = text.substring(contextStart, index);
    const words = context.split(/\s+/);

    // Look for potential names (2-3 word capitalized sequences)
    for (let i = words.length - 1; i >= Math.max(0, words.length - 5); i--) {
      const potentialName = words.slice(i).join(' ');
      if (this.isValidName(potentialName)) {
        return potentialName;
      }
    }

    return undefined;
  }

  isValidName(name) {
    if (!name || name.length < 2 || name.length > 50) return false;

    const words = name.split(/\s+/);
    if (words.length > 4) return false; // Too many words

    // Check if words look like names (capitalized)
    return words.every(word => /^[A-Z][a-z]+$/.test(word) && word.length >= 2);
  }

  extractTitleFromContext(text, name) {
    if (!name) return undefined;

    const nameIndex = text.indexOf(name);
    if (nameIndex === -1) return undefined;

    // Look for titles after the name
    const contextAfter = text.substring(nameIndex, nameIndex + 200);
    const titlePatterns = [
      /(?:,|\s+)(CEO|CTO|CFO|President|Director|Manager|VP|Vice President|Chief Executive|Chief Technology|Chief Financial|General Manager|Project Manager|Development Manager)/i,
      /(?:,|\s+)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Director|Manager|President|Officer))/i
    ];

    for (const pattern of titlePatterns) {
      const match = contextAfter.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return undefined;
  }

  formatPhoneNumber(phone) {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return phone; // Return original if can't format
  }

  calculateContactConfidence(contact) {
    let score = 0;

    if (contact.name) score += 40;
    if (contact.email) score += 35;
    if (contact.phone) score += 25;
    if (contact.title) score += 15;

    // Bonus for having multiple contact methods
    const contactMethods = [contact.name, contact.email, contact.phone].filter(Boolean).length;
    if (contactMethods >= 2) score += 20;

    return Math.min(score, 100);
  }

  extractProjectTypeFromText(text) {
    if (!text) return "Unknown";
    
    const lowerText = text.toLowerCase();
    
    // Look for specific project types
    for (const type of this.patterns.projectType) {
      if (lowerText.includes(type)) {
        return type.charAt(0).toUpperCase() + type.slice(1);
      }
    }
    
    // Look for compound project types
    const compoundTypes = [
      'mixed-use development',
      'residential complex',
      'commercial center',
      'business district',
      'entertainment district'
    ];
    
    for (const type of compoundTypes) {
      if (lowerText.includes(type)) {
        return type.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      }
    }
    
    return "Unknown";
  }

  extractBudgetFromText(text) {
    if (!text) return "Unknown";
    
    // Enhanced budget extraction patterns
    const enhancedPatterns = [
      // Dollar amounts with various formats
      /[\$]?(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:k|K|m|M|b|B|thousand|million|billion|k|m|b)/i,
      // Budget/cost/investment followed by amount
      /(?:budget|cost|investment|price|amount|value|funding)\s*(?:of|:)?\s*[\$]?(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      // Amount followed by currency or unit
      /(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:k|K|m|M|b|B|thousand|million|billion|dollars?|USD)/i,
      // Original patterns
      ...this.patterns.budget
    ];
    
    for (const pattern of enhancedPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const amount = parseFloat(match[1].replace(/,/g, ''));
        if (isNaN(amount)) continue;
        
        // Determine multiplier based on text context
        const lowerText = text.toLowerCase();
        let multiplier = 1;
        
        if (lowerText.includes('k') || lowerText.includes('thousand')) {
          multiplier = 1000;
        } else if (lowerText.includes('m') || lowerText.includes('million')) {
          multiplier = 1000000;
        } else if (lowerText.includes('b') || lowerText.includes('billion')) {
          multiplier = 1000000000;
        }
        
        const finalAmount = amount * multiplier;
        if (finalAmount > 0) {
          return finalAmount.toString();
        }
      }
    }
    
    return "Unknown";
  }

  extractTimelineFromText(text) {
    if (!text) return "Unknown";
    
    for (const pattern of this.patterns.timeline) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const year = parseInt(match[1]);
        const currentYear = new Date().getFullYear();
        
        // Validate year is reasonable (current year to 10 years in future)
        if (year >= currentYear && year <= currentYear + 10) {
          return year.toString();
        }
      }
    }
    
    return "Unknown";
  }

  extractRoomCountFromText(text) {
    if (!text) return "Unknown";
    
    for (const pattern of this.patterns.roomCount) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const count = parseInt(match[1]);
        if (count > 0 && count < 10000) {
          return count.toString();
        }
      }
    }
    
    return "Unknown";
  }

  extractSquareFootageFromText(text) {
    if (!text) return "Unknown";
    
    for (const pattern of this.patterns.squareFootage) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].replace(/,/g, '');
      }
    }
    
    return "Unknown";
  }

  extractEmployeesFromText(text) {
    if (!text) return "Unknown";
    
    for (const pattern of this.patterns.employees) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].replace(/,/g, '');
      }
    }
    
    return "Unknown";
  }

  extractContactInfoFromText(text) {
    if (!text) return { name: "Unknown", email: "Unknown", phone: "Unknown", title: "Unknown", company: "Unknown" };

    const contact = {
      name: "Unknown",
      email: "Unknown",
      phone: "Unknown",
      title: "Unknown",
      company: "Unknown"
    };

    // Extract email with better patterns
    const emailPatterns = [
      /\b([A-Za-z0-9._%+-]+)@([A-Za-z0-9.-]+\.[A-Z|a-z]{2,})\b/g,
      /\bcontact[ed]?\s*:?\s*([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})\b/i,
      /\bemail[ed]?\s*:?\s*([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})\b/i
    ];

    for (const pattern of emailPatterns) {
      const match = text.match(pattern);
      if (match) {
        contact.email = Array.isArray(match) ? match[0] : match;
        break;
      }
    }

    // Extract phone numbers with enhanced patterns
    const phonePatterns = [
      /(\+\d{1,3}[-.\s]?)?\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})(?:\s*(?:ext|extension|x)\s*(\d+))?/,
      /(\d{3})[-.\s]?(\d{3})[-.\s]?(\d{4})(?:\s*(?:ext|extension|x)\s*(\d+))?/,
      /(\d{3})[-.\s]?(\d{4})[-.\s]?(\d{4})/,
      /1?[-.\s]?(\d{3})[-.\s]?(\d{3})[-.\s]?(\d{4})/,
      /(?:phone|tel|mobile|cell)\s*:?\s*([\d\s\-\.\(\)\+ext]+)/i
    ];

    for (const pattern of phonePatterns) {
      const phoneMatch = text.match(pattern);
      if (phoneMatch) {
        contact.phone = phoneMatch[0].replace(/\s+/g, '-').replace(/--+/g, '-');
        break;
      }
    }

    // Extract names and titles with enhanced patterns
    const nameTitlePatterns = [
      // "Name, Title, Company"
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([^,]+?),\s*([^,\n]+)/i,
      // "Title Name of Company"
      /(?:Mr\.?|Mrs\.?|Ms\.?|Dr\.?)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*(?:of|at)\s+([^,\n]+)/i,
      // "Company Contact: Name"
      /(?:contact|representative|spokesperson)\s*:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
      // "Name (Title)"
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*\(([^)]+)\)/i,
      // "Title: Name"
      /(?:CEO|CTO|CFO|COO|President|Director|Manager|VP|Vice President|Chief|Executive|Founder)\s*:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i
    ];

    for (const pattern of nameTitlePatterns) {
      const match = text.match(pattern);
      if (match) {
        if (match[2] && match[2].length > 3) {
          // Pattern with title
          contact.name = match[1].trim();
          contact.title = match[2].trim();
        } else {
          // Simple name extraction
          contact.name = match[1].trim();
        }
        break;
      }
    }

    // If no specific contact found, try to extract from context
    if (contact.name === "Unknown") {
      const contextPatterns = [
        /(?:spoke|said|told|explained|commented)\s+(?:by|with)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
        /(?:according to|per|via)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i
      ];

      for (const pattern of contextPatterns) {
        const match = text.match(pattern);
        if (match && match[1].length > 3) {
          contact.name = match[1].trim();
          contact.title = "Representative";
          break;
        }
      }
    }

    return contact;
  }

  extractDescriptionFromText(text) {
    if (!text) return "Unknown";
    
    // Find the most relevant sentence that describes the project
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    
    const relevantKeywords = [
      'announced', 'launched', 'developed', 'constructed', 'project',
      'development', 'construction', 'expansion', 'renovation', 'opening'
    ];
    
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      if (relevantKeywords.some(keyword => lowerSentence.includes(keyword))) {
        return sentence.trim();
      }
    }
    
    // Fallback to first meaningful sentence
    return sentences[0] ? sentences[0].trim() : text.substring(0, 200).trim();
  }

  calculateBudgetRange(budget) {
    if (!budget || budget === 'Unknown') return 'not_specified';
    
    const amount = parseFloat(budget);
    if (isNaN(amount)) return 'not_specified';
    
    if (amount < 10000) return 'under_10k';
    if (amount < 50000) return '10k_50k';
    if (amount < 100000) return '50k_100k';
    if (amount < 500000) return '100k_500k';
    if (amount < 1000000) return '500k_1m';
    if (amount < 5000000) return '1m_5m';
    if (amount < 10000000) return '5m_10m';
    return 'over_10m';
  }

  extractAllData(text) {
    const data = {
      company: this.extractCompanyFromText(text),
      location: this.extractLocationFromText(text),
      projectType: this.extractProjectTypeFromText(text),
      budget: this.extractBudgetFromText(text),
      budgetRange: this.calculateBudgetRange(this.extractBudgetFromText(text)),
      timeline: this.extractTimelineFromText(text),
      roomCount: this.extractRoomCountFromText(text),
      squareFootage: this.extractSquareFootageFromText(text),
      employees: this.extractEmployeesFromText(text),
      contactInfo: this.extractContactInfoFromText(text),
      description: this.extractDescriptionFromText(text),
      // Enhanced fields
      industryType: this.extractIndustryTypeFromText(text),
      keywords: this.extractKeywordsFromText(text),
      confidence: this.calculateDataConfidence(text)
    };

    // Cross-validate and enhance data
    return this.crossValidateAndEnhance(data, text);
  }

  // Extract data using custom columns
  extractWithCustomColumns(text, customColumns = []) {
    const data = this.extractAllData(text);

    // Extract custom fields using column descriptions
    const customData = {};
    customColumns.forEach(column => {
      const fieldKey = column.field_key;
      const description = column.description;

      // Use pattern matching based on column description
      const extractedValue = this.extractFromDescription(text, description, column.data_type);
      if (extractedValue && extractedValue !== 'Unknown') {
        customData[fieldKey] = extractedValue;
      }
    });

    return {
      ...data,
      ...customData
    };
  }

  // Extract data based on natural language description
  extractFromDescription(text, description, dataType = 'text') {
    // Convert description to searchable patterns
    const lowerDesc = description.toLowerCase();
    const lowerText = text.toLowerCase();

    // Look for patterns that match the description
    const sentences = text.split(/[.!?]+/);

    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();

      // Check if sentence is relevant to the description
      const descriptionWords = lowerDesc.split(/\s+/);
      const matches = descriptionWords.filter(word =>
        word.length > 3 && lowerSentence.includes(word)
      );

      if (matches.length > descriptionWords.length * 0.5) { // 50% match threshold
        // Extract the actual value based on data type
        switch (dataType) {
          case 'currency':
          case 'number':
            const numberMatch = sentence.match(/[\$]?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
            if (numberMatch) return numberMatch[1].replace(/,/g, '');
            break;

          case 'date':
            const dateMatch = sentence.match(/(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})/);
            if (dateMatch) return dateMatch[1];
            break;

          case 'email':
            const emailMatch = sentence.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
            if (emailMatch) return emailMatch[0];
            break;

          case 'phone':
            const phoneMatch = sentence.match(/(\+\d{1,3}[-.\s]?)?\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})(?:\s*(?:ext|extension|x)\s*(\d+))?/);
            if (phoneMatch) return phoneMatch[0].replace(/\s+/g, '-').replace(/--+/g, '-');
            break;

          case 'url':
            const urlMatch = sentence.match(/https?:\/\/[^\s]+/);
            if (urlMatch) return urlMatch[0];
            break;

          default:
            // For text, try to extract meaningful content
            const words = sentence.trim().split(/\s+/);
            if (words.length > 3 && words.length < 20) {
              return sentence.trim();
            }
        }
      }
    }

    return 'Unknown';
  }

  extractIndustryTypeFromText(text) {
    if (!text) return "mixed_use";

    const lowerText = text.toLowerCase();

    // Healthcare & Medical
    if (lowerText.includes('hospital') || lowerText.includes('clinic') || lowerText.includes('medical center') ||
        lowerText.includes('healthcare') || lowerText.includes('pharmaceutical')) {
      return 'healthcare';
    }

    // Education
    if (lowerText.includes('school') || lowerText.includes('university') || lowerText.includes('college') ||
        lowerText.includes('academy') || lowerText.includes('educational') || lowerText.includes('campus')) {
      return 'education';
    }

    // Hospitality & Tourism
    if (lowerText.includes('hotel') || lowerText.includes('resort') || lowerText.includes('hospitality') ||
        lowerText.includes('tourism') || lowerText.includes('casino') || lowerText.includes('entertainment')) {
      return 'hospitality';
    }

    // Residential
    if (lowerText.includes('apartment') || lowerText.includes('condominium') || lowerText.includes('residential') ||
        lowerText.includes('housing') || lowerText.includes('community') || lowerText.includes('neighborhood')) {
      return 'residential';
    }

    // Commercial & Office
    if (lowerText.includes('office') || lowerText.includes('commercial') || lowerText.includes('business center') ||
        lowerText.includes('corporate') || lowerText.includes('headquarters')) {
      return 'commercial';
    }

    // Retail & Shopping
    if (lowerText.includes('retail') || lowerText.includes('shopping center') || lowerText.includes('mall') ||
        lowerText.includes('store') || lowerText.includes('boutique') || lowerText.includes('marketplace')) {
      return 'retail';
    }

    // Industrial & Manufacturing
    if (lowerText.includes('industrial') || lowerText.includes('manufacturing') || lowerText.includes('warehouse') ||
        lowerText.includes('distribution') || lowerText.includes('logistics') || lowerText.includes('factory')) {
      return 'industrial';
    }

    // Infrastructure
    if (lowerText.includes('infrastructure') || lowerText.includes('transportation') || lowerText.includes('bridge') ||
        lowerText.includes('highway') || lowerText.includes('rail') || lowerText.includes('airport') ||
        lowerText.includes('seaport') || lowerText.includes('utility')) {
      return 'infrastructure';
    }

    // Mixed-Use or default
    return 'mixed_use';
  }

  extractKeywordsFromText(text) {
    if (!text) return [];

    const keywords = [];
    const lowerText = text.toLowerCase();

    // Business and project keywords
    const businessKeywords = [
      'development', 'construction', 'project', 'expansion', 'renovation', 'upgrade',
      'investment', 'funding', 'announcement', 'launch', 'opening', 'completion',
      'acquisition', 'partnership', 'collaboration', 'joint venture', 'merger'
    ];

    // Industry-specific keywords
    const industryKeywords = [
      'hotel', 'resort', 'apartment', 'office', 'retail', 'commercial', 'residential',
      'industrial', 'healthcare', 'education', 'hospitality', 'infrastructure',
      'restaurant', 'entertainment', 'mixed-use', 'condominium', 'warehouse'
    ];

    // Location keywords (cities, states, regions)
    const locationKeywords = [
      'downtown', 'uptown', 'midtown', 'coast', 'bay area', 'suburb', 'urban',
      'rural', 'metropolitan', 'business district', 'financial district'
    ];

    // Add matching keywords
    [...businessKeywords, ...industryKeywords, ...locationKeywords].forEach(keyword => {
      if (lowerText.includes(keyword) && !keywords.includes(keyword)) {
        keywords.push(keyword);
      }
    });

    // Extract proper nouns (potential company names, locations)
    const properNouns = text.match(/\b[A-Z][a-z]{2,}\b/g) || [];
    properNouns.forEach(noun => {
      if (noun.length > 3 && !keywords.includes(noun.toLowerCase())) {
        keywords.push(noun.toLowerCase());
      }
    });

    return keywords.slice(0, 10); // Limit to top 10 keywords
  }

  calculateDataConfidence(text) {
    if (!text) return 0;

    let confidence = 0;
    let maxConfidence = 0;

    // Company confidence
    if (this.extractCompanyFromText(text) !== 'Unknown') {
      confidence += 20;
    }
    maxConfidence += 20;

    // Location confidence
    if (this.extractLocationFromText(text) !== 'Unknown') {
      confidence += 15;
    }
    maxConfidence += 15;

    // Budget confidence
    if (this.extractBudgetFromText(text) !== 'Unknown') {
      confidence += 20;
    }
    maxConfidence += 20;

    // Contact info confidence
    const contactInfo = this.extractContactInfoFromText(text);
    if (contactInfo.email !== 'Unknown' || contactInfo.phone !== 'Unknown') {
      confidence += 15;
    }
    maxConfidence += 15;

    // Project details confidence
    const details = [
      this.extractProjectTypeFromText(text),
      this.extractTimelineFromText(text),
      this.extractRoomCountFromText(text),
      this.extractSquareFootageFromText(text)
    ];
    const knownDetails = details.filter(detail => detail !== 'Unknown').length;
    confidence += (knownDetails / details.length) * 20;
    maxConfidence += 20;

    // Text quality confidence
    if (text.length > 500) confidence += 10;
    else if (text.length > 200) confidence += 5;
    maxConfidence += 10;

    return maxConfidence > 0 ? Math.round((confidence / maxConfidence) * 100) : 0;
  }

  crossValidateAndEnhance(data, text) {
    const lowerText = text.toLowerCase();

    // If we have a company and project type, enhance the description
    if (data.company !== 'Unknown' && data.projectType !== 'Unknown') {
      data.description = `${data.company} is developing a ${data.projectType.toLowerCase()} project${data.location !== 'Unknown' ? ` in ${data.location}` : ''}. ${data.description}`;
    }

    // Validate budget against project type
    if (data.budget !== 'Unknown' && data.projectType !== 'Unknown') {
      const budgetAmount = parseFloat(data.budget);
      const projectType = data.projectType.toLowerCase();

      // Basic budget validation by project type
      const budgetRanges = {
        'hotel': [5000000, 50000000],
        'resort': [10000000, 100000000],
        'apartment': [1000000, 20000000],
        'office': [2000000, 30000000],
        'retail': [1000000, 15000000]
      };

      const range = budgetRanges[projectType];
      if (range && (budgetAmount < range[0] || budgetAmount > range[1])) {
        console.log(`⚠️ Budget ${budgetAmount} seems unusual for ${projectType} project`);
      }
    }

    // Enhance contact info with company context
    if (data.contactInfo.company === 'Unknown' && data.company !== 'Unknown') {
      data.contactInfo.company = data.company;
    }

    // Add contextual keywords
    if (data.keywords.length === 0) {
      const contextualKeywords = [];

      if (lowerText.includes('green') || lowerText.includes('sustainable')) {
        contextualKeywords.push('sustainable');
      }
      if (lowerText.includes('luxury') || lowerText.includes('premium')) {
        contextualKeywords.push('luxury');
      }
      if (lowerText.includes('smart') || lowerText.includes('technology')) {
        contextualKeywords.push('technology');
      }

      data.keywords = contextualKeywords;
    }

    return data;
  }

  // Extract multiple contacts from text
  extractMultipleContacts(text) {
    if (!text) return [];

    const contacts = [];
    const lowerText = text.toLowerCase();

    // Enhanced contact extraction patterns
    const contactPatterns = [
      // "Name, Title, Company"
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([^,]+?),\s*([^,\n]+)/g,
      // "Title Name of Company"
      /(?:Mr\.?|Mrs\.?|Ms\.?|Dr\.?)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*(?:of|at)\s+([^,\n]+)/g,
      // "Company Contact: Name"
      /(?:contact|representative|spokesperson|CEO|CTO|CFO|COO|President|Director|Manager)\s*:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
      // "Name (Title)"
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*\(([^)]+)\)/g
    ];

    const extractedContacts = new Set(); // To avoid duplicates

    for (const pattern of contactPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const contactData = this.parseContactMatch(match, text);

        if (contactData && contactData.name) {
          const contactKey = `${contactData.name}-${contactData.title || ''}-${contactData.company || ''}`.toLowerCase();

          if (!extractedContacts.has(contactKey)) {
            extractedContacts.add(contactKey);
            contacts.push(contactData);
          }
        }

        // Prevent infinite loop
        if (contacts.length >= 10) break;
      }

      if (contacts.length >= 10) break;
    }

    // Extract email and phone separately and try to match with contacts
    const emails = this.extractEmailsFromText(text);
    const phones = this.extractPhonesFromText(text);

    // Match emails and phones to existing contacts
    contacts.forEach((contact, index) => {
      if (!contact.email && emails.length > 0) {
        contact.email = emails.shift();
      }
      if (!contact.phone && phones.length > 0) {
        contact.phone = phones.shift();
      }

      // Set confidence score based on completeness
      let confidence = 0.3; // Base confidence
      if (contact.name) confidence += 0.2;
      if (contact.title) confidence += 0.2;
      if (contact.company) confidence += 0.1;
      if (contact.email) confidence += 0.15;
      if (contact.phone) confidence += 0.15;

      contact.confidence_score = Math.min(1.0, confidence);
    });

    // Create additional contacts for unmatched emails/phones
    [...emails, ...phones].forEach((contactInfo, index) => {
      const isEmail = contactInfo.includes('@');
      const contactData = {
        name: isEmail ? 'Contact' : 'Phone Contact',
        email: isEmail ? contactInfo : null,
        phone: !isEmail ? contactInfo : null,
        contact_type: 'representative',
        confidence_score: 0.2,
        source_text: text.substring(Math.max(0, text.indexOf(contactInfo) - 50), text.indexOf(contactInfo) + contactInfo.length + 50)
      };

      contacts.push(contactData);
    });

    return contacts.slice(0, 15); // Limit to 15 contacts max
  }

  parseContactMatch(match, fullText) {
    const contact = {
      name: null,
      title: null,
      company: null,
      contact_type: 'representative',
      confidence_score: 0.5,
      source_text: match[0]
    };

    if (match[1] && match[2]) {
      // Pattern: Name, Title, Company
      contact.name = match[1].trim();
      contact.title = match[2].trim();
      if (match[3]) contact.company = match[3].trim();
    } else if (match[1] && match[2]) {
      // Pattern: Title Name of Company
      contact.title = match[1].trim();
      contact.name = match[2].trim();
    } else if (match[1]) {
      // Pattern: Contact: Name
      contact.name = match[1].trim();
      contact.title = 'Representative';
    }

    // Try to find company if not already set
    if (!contact.company) {
      const companyMatch = fullText.match(new RegExp(contact.name + '\\s+(?:of|at)\\s+([^,\\n]+)', 'i'));
      if (companyMatch) {
        contact.company = companyMatch[1].trim();
      }
    }

    // Validate contact has at least a name
    if (contact.name && contact.name.length > 2) {
      return contact;
    }

    return null;
  }

  extractEmailsFromText(text) {
    const emailRegex = /\b([A-Za-z0-9._%+-]+)@([A-Za-z0-9.-]+\.[A-Z|a-z]{2,})\b/g;
    const emails = [];
    let match;

    while ((match = emailRegex.exec(text)) !== null) {
      const email = match[0];
      if (!emails.includes(email)) {
        emails.push(email);
      }
    }

    return emails;
  }

  extractPhonesFromText(text) {
    const phonePatterns = [
      /(\+\d{1,3}[-.\s]?)?\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})(?:\s*(?:ext|extension|x)\s*(\d+))?/g,
      /(\d{3})[-.\s]?(\d{3})[-.\s]?(\d{4})(?:\s*(?:ext|extension|x)\s*(\d+))?/g,
      /(\d{3})[-.\s]?(\d{4})[-.\s]?(\d{4})/g,
      /1?[-.\s]?(\d{3})[-.\s]?(\d{3})[-.\s]?(\d{4})/g
    ];

    const phones = new Set();

    for (const pattern of phonePatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const phone = match[0].replace(/\s+/g, '-').replace(/--+/g, '-');
        phones.add(phone);
      }
    }

    return Array.from(phones);
  }

  // Advanced extraction using context clues
  extractContextualData(text) {
    const data = this.extractAllData(text);
    
    // Enhance with context clues
    const lowerText = text.toLowerCase();
    
    // Project status
    if (lowerText.includes('announced') || lowerText.includes('proposed')) {
      data.status = 'proposed';
    } else if (lowerText.includes('under construction') || lowerText.includes('construction began')) {
      data.status = 'under_construction';
    } else if (lowerText.includes('completed') || lowerText.includes('opened')) {
      data.status = 'completed';
    } else {
      data.status = 'unknown';
    }
    
    // Project priority
    if (lowerText.includes('urgent') || lowerText.includes('immediate') || lowerText.includes('asap')) {
      data.priority = 'high';
    } else if (lowerText.includes('soon') || lowerText.includes('quickly')) {
      data.priority = 'medium';
    } else {
      data.priority = 'low';
    }
    
    // Industry type
    if (lowerText.includes('hotel') || lowerText.includes('resort') || lowerText.includes('hospitality')) {
      data.industryType = 'hospitality';
    } else if (lowerText.includes('apartment') || lowerText.includes('residential') || lowerText.includes('housing')) {
      data.industryType = 'residential';
    } else if (lowerText.includes('office') || lowerText.includes('commercial') || lowerText.includes('business')) {
      data.industryType = 'commercial';
    } else if (lowerText.includes('retail') || lowerText.includes('shopping') || lowerText.includes('store')) {
      data.industryType = 'retail';
    } else {
      data.industryType = 'mixed_use';
    }
    
    return data;
  }

  // Enhanced AI-powered extraction methods
  async extractWithCustomColumns(content, customColumns = []) {
    if (!this.deepseekApiKey || !content || customColumns.length === 0) {
      return {};
    }

    try {
      console.log(`🤖 Extracting ${customColumns.length} custom fields with AI...`);

      // Create context-aware prompts for each custom column
      const extractions = {};

      for (const column of customColumns) {
        if (column.is_visible) {
          const prompt = this.buildCustomColumnPrompt(column, content);
          const extractedValue = await this.callDeepseekAPI(prompt);

          if (extractedValue && extractedValue !== 'Unknown' && extractedValue !== 'N/A') {
            extractions[column.field_key] = this.formatExtractedValue(extractedValue, column.data_type);
            console.log(`📝 Extracted ${column.name}: ${extractions[column.field_key]}`);
          }
        }
      }

      return extractions;
    } catch (error) {
      console.warn(`⚠️ AI extraction failed: ${error.message}`);
      return {};
    }
  }

  buildCustomColumnPrompt(column, content) {
    const contextPrompts = {
      contact: `Extract contact information from the following article. Look for: names, titles, companies, email addresses, phone numbers, or any contact details.`,
      project: `Extract project-related information from the article including: size, capacity, features, specifications, or project details.`,
      company: `Extract company/organization information from the article including: company names, ownership, partnerships, or corporate details.`,
      location: `Extract location information from the article including: addresses, cities, regions, landmarks, or geographic details.`,
      financial: `Extract financial information from the article including: costs, budgets, investments, funding, pricing, or monetary figures.`,
      timeline: `Extract time-related information from the article including: dates, deadlines, schedules, timelines, or temporal information.`
    };

    const basePrompt = contextPrompts[column.category] || `Extract information from the article.`;
    const specificPrompt = `Based on this description: "${column.description}", extract the most relevant ${column.data_type} value.`;

    return `${basePrompt} ${specificPrompt}

Article content:
${content.substring(0, 2000)}

Return only the extracted value, or "Unknown" if not found. Be precise and return only the actual value without additional text.`;
  }

  async callDeepseekAPI(prompt) {
    if (!this.deepseekApiKey) {
      throw new Error('Deepseek API key not configured');
    }

    // Check cache first
    const cacheKey = this.generateCacheKey(prompt);
    if (this.extractionCache.has(cacheKey)) {
      return this.extractionCache.get(cacheKey);
    }

    try {
      this.apiCallCount++;

      const response = await require('axios').post('https://api.deepseek.com/v1/chat/completions', {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are a precise data extraction assistant. Return only the extracted value without any additional text or explanation.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 100,
        temperature: 0.1 // Low temperature for consistent extraction
      }, {
        headers: {
          'Authorization': `Bearer ${this.deepseekApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      const extractedValue = response.data.choices?.[0]?.message?.content?.trim();

      // Cache the result
      if (extractedValue) {
        this.extractionCache.set(cacheKey, extractedValue);
      }

      return extractedValue || 'Unknown';
    } catch (error) {
      console.error(`❌ Deepseek API error:`, error.message);
      throw error;
    }
  }

  generateCacheKey(prompt) {
    // Create a hash of the prompt for caching
    let hash = 0;
    for (let i = 0; i < prompt.length; i++) {
      const char = prompt.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }

  formatExtractedValue(value, dataType) {
    if (!value || value === 'Unknown' || value === 'N/A') {
      return null;
    }

    switch (dataType) {
      case 'currency':
        // Extract numeric value and format as currency
        const currencyMatch = value.match(/[\$]?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
        return currencyMatch ? parseFloat(currencyMatch[1].replace(/,/g, '')) : null;

      case 'number':
        const numberMatch = value.match(/(\d+(?:,\d{3})*(?:\.\d+)?)/);
        return numberMatch ? parseFloat(numberMatch[1].replace(/,/g, '')) : null;

      case 'date':
        // Try to parse various date formats
        const dateMatch = value.match(/(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}|\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/);
        if (dateMatch) {
          const date = new Date(dateMatch[1]);
          return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
        }
        return null;

      case 'boolean':
        const lowerValue = value.toLowerCase();
        if (['yes', 'true', '1', 'y'].includes(lowerValue)) return true;
        if (['no', 'false', '0', 'n'].includes(lowerValue)) return false;
        return null;

      case 'email':
        const emailMatch = value.match(/[\w.-]+@[\w.-]+\.\w+/);
        return emailMatch ? emailMatch[0] : null;

      case 'phone':
        const phoneMatch = value.match(/[\+]?[\d\s\-\(\)]{10,}/);
        return phoneMatch ? phoneMatch[0].trim() : null;

      case 'url':
        const urlMatch = value.match(/https?:\/\/[^\s]+/);
        return urlMatch ? urlMatch[0] : null;

      default:
        // For text and other types, clean up the value
        return value.trim().substring(0, 500); // Limit text length
    }
  }

  // Hybrid extraction method combining AI and patterns
  async extractWithHybridApproach(content, customColumns = []) {
    console.log(`🔄 Using hybrid extraction approach...`);

    const results = {};

    // First, try pattern-based extraction (fast and cheap)
    const patternResults = this.extractWithPatterns(content);

    // Then, use AI for custom columns and missing data
    const aiResults = await this.extractWithCustomColumns(content, customColumns);

    // Merge results, preferring AI for custom columns
    Object.assign(results, patternResults, aiResults);

    // Validate and clean results
    for (const [key, value] of Object.entries(results)) {
      if (value === 'Unknown' || value === 'N/A' || value === '') {
        results[key] = null;
      }
    }

    return results;
  }

  // Cost optimization methods
  optimizeContentForAI(content) {
    // Remove unnecessary content to reduce token usage
    let optimized = content
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s.,!?-]/g, '') // Remove special characters
      .trim();

    // Limit content length while preserving important information
    const maxLength = Math.min(optimized.length, 3000);
    optimized = optimized.substring(0, maxLength);

    // Ensure we don't cut in the middle of a sentence
    const lastSentenceEnd = optimized.lastIndexOf('.');
    if (lastSentenceEnd > maxLength * 0.8) {
      optimized = optimized.substring(0, lastSentenceEnd + 1);
    }

    return optimized;
  }

  // Batch processing for cost efficiency
  async extractMultipleContacts(content, maxContacts = 3) {
    if (!this.deepseekApiKey || !content) {
      return [];
    }

    try {
      const prompt = `Extract up to ${maxContacts} contact persons from the following article. For each contact, provide: name, title, company, email, phone.

Return the results as a JSON array in this format:
[{"name": "John Doe", "title": "CEO", "company": "ABC Corp", "email": "john@abc.com", "phone": "123-456-7890"}]

Article:
${this.optimizeContentForAI(content)}

Return only the JSON array, no additional text.`;

      const response = await this.callDeepseekAPI(prompt);

      try {
        const contacts = JSON.parse(response);
        return Array.isArray(contacts) ? contacts.slice(0, maxContacts) : [];
      } catch (parseError) {
        console.warn(`⚠️ Failed to parse contact extraction JSON: ${parseError.message}`);
        return [];
      }
    } catch (error) {
      console.warn(`⚠️ Contact extraction failed: ${error.message}`);
      return [];
    }
  }
}

module.exports = DataExtractionService;
