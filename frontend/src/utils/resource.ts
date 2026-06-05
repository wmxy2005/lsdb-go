import querystring from 'querystring';
import { CONFIG, DIR_SEP } from '@/constants';

export function resolvePath(resBase: any, base: string, category: string, subcategory: string, name: string, filename: string) {
    const parts: string[] = [];
    if (resBase != null && String(resBase).trim() !== '') {
      parts.push(String(resBase).trim());
    }
    for (const segment of [base, category, subcategory, name, filename]) {
      if (segment != null && String(segment).trim() !== '') {
        parts.push(String(segment).trim());
      }
    }
    return parts.join(DIR_SEP);
}

export function resolveUrl(base: string, category: string, subcategory: string, name: string, filename: string) {
    let params = { base: base, category: category, subcategory: subcategory, name: name, filename: filename};
	let query = querystring.stringify(params);
    return CONFIG.apiUrl+'/api/resource?force=true&' + query;
}

export function resolveSearchUrl(base: string, category: string, subcategory: string, tag: string, pageSize: number, page: number, favi: boolean, sort: string) {
    let params = { base: base, category: category, subcategory: subcategory, tag: tag, pageSize: pageSize, page: page, favi: favi, sort: sort};
    return resolveSearchPramUrl(params);
}

export function resolveSearchPramUrl(params : any) {
    let paramString = JSON.stringify(params, (key, value)=>{
        if(value === '') {
            return undefined;
        }
        return value;
    })
    let query = querystring.stringify(JSON.parse(paramString));
    return query;
}

export function resolveTagUrl(tagType: string, tag: string, searchInfo : any) {
    var param : any = {};
    let paramName = 'tag';
	if ('base' === tagType) {
        paramName = 'base';
    } else if ('category' === tagType) {
        paramName = 'category';
    } else if ('subcategory' === tagType) {
        paramName = 'subcategory';
    }
    param[paramName] = tag;
    if(searchInfo && searchInfo?.sort){
        param['sort'] = searchInfo?.sort;
    }
    return CONFIG.searchUrl + '?' + resolveSearchPramUrl(param);
}

export function resolveTagColor(type : string, index : number) {
    const baseColor = 'magenta';
    const categoryColor = 'volcano';
    const subcategoryColor = 'gold';
    const colorList = ['green', 'cyan', 'blue', 'geekblue'];
    if ('base' == type) {
        return baseColor;
    } else if ('category' == type) {
        return categoryColor;
    } else if ('subcategory' == type) {
        return subcategoryColor;
    } else if ('tag' == type) {
        var index = (index) % colorList.length;
        return colorList[index];
    } else if ('tag2' == type) {
        return 'purple';
    } else {
        return '';
    }
}

export function resolveBaseColor(base : string) {
    let avatarIndex = 0;
    for(var baseItemIndex in CONFIG.resBaseList) {
      let baseItem = CONFIG.resBaseList[baseItemIndex];
      if(base == baseItem?.name) {
        avatarIndex = Number(baseItemIndex);
        break;
      }
    }
    return resolveIndexColor(avatarIndex);
}

export function resolveIndexColor(index : number) {
    const colorList = ['#f56a00', '#7265e6', '#ffbf00', '#00a2ae'];
    var index = (index) % colorList.length;
    return colorList[index];
}