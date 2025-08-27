class DataExtractionService {
  constructor() {
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
    
    // Enhanced company extraction patterns
    const enhancedPatterns = [
      // Company announces/develops pattern
      /([A-Z][a-zA-Z\s&.,]+?)\s+(?:announces|launches|develops|constructs|expands|opens|plans|proposes)/i,
      // Announced by company pattern
      /(?:announced by|developed by|constructed by|launched by)\s+([A-Z][a-zA-Z\s&.,]+?)(?:\s|$|,|\.)/i,
      // Company name followed by project type
      /([A-Z][a-zA-Z\s&.,]+?)\s+(?:hotel|resort|apartment|office|building|complex|development|project)/i,
      // Company name in quotes or parentheses
      /["']([A-Z][a-zA-Z\s&.,]+?)["']/,
      /\(([A-Z][a-zA-Z\s&.,]+?)\)/,
      // Original patterns
      ...this.patterns.company
    ];
    
    for (const pattern of enhancedPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const company = match[1].trim();
        // Clean up common artifacts and validate
        const cleaned = company.replace(/^(the\s+|a\s+)/i, '').replace(/[.,]$/, '');
        if (cleaned.length > 2 && cleaned.length < 50) {
          return cleaned;
        }
      }
    }
    
    // Try to extract from title if it looks like a company name
    const words = text.split(/\s+/);
    for (let i = 0; i < Math.min(3, words.length); i++) {
      const word = words[i];
      if (word.match(/^[A-Z][a-z]+$/) && word.length > 3) {
        return word;
      }
    }
    
    return "Unknown";
  }

  extractLocationFromText(text) {
    if (!text) return "Unknown";
    
    // Enhanced location extraction patterns
    const enhancedPatterns = [
      // Location followed by project type
      /([A-Z][a-zA-Z\s,]+?)\s+(?:hotel|resort|apartment|office|building|complex|development|project)/i,
      // Project type in location
      /(?:hotel|resort|apartment|office|building|complex|development|project)\s+(?:in|at|near)\s+([A-Z][a-zA-Z\s,]+?)(?:\s|$|,|\.)/i,
      // Common city/state patterns
      /([A-Z][a-zA-Z\s]+?),\s*([A-Z]{2})/i, // City, State
      /([A-Z][a-zA-Z\s]+?)\s+(?:County|City|District|Area|Region)/i,
      // Original patterns
      ...this.patterns.location
    ];
    
    for (const pattern of enhancedPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const location = match[1].trim();
        // Clean up common artifacts and validate
        const cleaned = location.replace(/[.,]$/, '');
        if (cleaned.length > 2 && cleaned.length < 50) {
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
        if (!text.toLowerCase().includes(word.toLowerCase() + ' announces') &&
            !text.toLowerCase().includes(word.toLowerCase() + ' develops')) {
          return word;
        }
      }
    }
    
    return "Unknown";
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
}

module.exports = DataExtractionService;
