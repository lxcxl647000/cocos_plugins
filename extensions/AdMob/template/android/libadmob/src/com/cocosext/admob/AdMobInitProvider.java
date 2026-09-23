package com.cocosext.admob;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.net.Uri;

/**
 * Zero-content {@link ContentProvider} whose only job is to run {@link #onCreate()}
 * before {@code Application.onCreate()} fires, guaranteeing the "admob"
 * bridge channel is registered before any JS code could possibly call it.
 * Declared in {@code AndroidManifest.xml} with a project-unique authority
 * ({@code ${applicationId}.admobinit}); never queried or written to.
 */
public final class AdMobInitProvider extends ContentProvider {
    @Override
    public boolean onCreate() {
        AdMobBridge.register(getContext());
        return true;
    }

    @Override
    public Cursor query(Uri uri, String[] projection, String selection, String[] selectionArgs, String sortOrder) {
        return null;
    }

    @Override
    public String getType(Uri uri) {
        return null;
    }

    @Override
    public Uri insert(Uri uri, ContentValues values) {
        return null;
    }

    @Override
    public int delete(Uri uri, String selection, String[] selectionArgs) {
        return 0;
    }

    @Override
    public int update(Uri uri, ContentValues values, String selection, String[] selectionArgs) {
        return 0;
    }
}
